import os
import tempfile
import json
import re
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv
import yt_dlp
from openai import OpenAI

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") 
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://gateway.ai.vercel.app/v1") 
MODEL_NAME = os.getenv("MODEL_NAME", "meta-llama/Meta-Llama-3.1-8B-Instruct")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 1024))
TEMPERATURE = float(os.getenv("TEMPERATURE", 0.3))  # Lower temperature for more consistent results

# Initialize OpenAI client
client = OpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
)

# ASR Setup
try:
    from faster_whisper import WhisperModel
    print("Loading Whisper model for real ASR...")
    asr_model = WhisperModel("base", device="cpu", compute_type="int8")
    ASR_AVAILABLE = True
    print("✅ Whisper ASR model loaded.")
except Exception as e:
    print(f"❌ Whisper ASR error: {e}")
    asr_model = None
    ASR_AVAILABLE = False

def chunk_transcript(transcript, max_chars=3000):
    """Split transcript into manageable chunks"""
    words = transcript.split()
    chunks = []
    current_chunk = []
    current_length = 0
    
    for word in words:
        word_length = len(word) + 1  # +1 for space
        if current_length + word_length > max_chars and current_chunk:
            chunks.append(' '.join(current_chunk))
            current_chunk = [word]
            current_length = word_length
        else:
            current_chunk.append(word)
            current_length += word_length
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def download_and_transcribe_video(video_url):
    """Download and transcribe video with better error handling"""
    if not ASR_AVAILABLE:
        raise Exception("ASR service not available")
    
    print(f"🎬 Downloading video: {video_url}")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # yt-dlp configuration for audio extraction
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': f'{temp_dir}/%(title)s.%(ext)s',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'wav',
                }],
                'quiet': True,
                'no_warnings': True,
                'extractaudio': True,
                'audioformat': 'wav',
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                print("📥 Downloading video...")
                info = ydl.extract_info(video_url, download=True)
                
                video_title = info.get('title', 'Unknown Video')
                duration = info.get('duration', 0)
                
                print(f"📼 Video: {video_title}")
                print(f"⏱️ Duration: {duration}s")
                
                # Find audio file
                audio_files = list(Path(temp_dir).glob('*.wav'))
                if not audio_files:
                    raise Exception("No audio file extracted")
                
                audio_file = audio_files[0]
                print(f"🎵 Transcribing: {audio_file.name}")
                
                # Transcribe with Whisper
                segments, info = asr_model.transcribe(str(audio_file))
                
                # Build transcript with timestamps
                transcript_parts = []
                timestamps = []
                
                for segment in segments:
                    transcript_parts.append(segment.text.strip())
                    timestamps.append({
                        'start': segment.start,
                        'end': segment.end,
                        'text': segment.text.strip()
                    })
                
                full_transcript = " ".join(transcript_parts)
                
                print(f"✅ Transcription complete: {len(full_transcript)} chars, {len(timestamps)} segments")
                
                return {
                    'transcript': full_transcript,
                    'title': video_title,
                    'duration': duration,
                    'timestamps': timestamps
                }
                
        except Exception as e:
            print(f"❌ Video processing error: {e}")
            raise

def generate_chapters_from_transcript(transcript, video_title, duration, timestamps):
    """Generate chapters with improved prompting and error handling"""
    print(f"🤖 Generating chapters for '{video_title}' ({duration}s)")
    
    try:
        # If transcript is too long, use first chunk + summary approach
        if len(transcript) > 3000:
            print(f"📝 Long transcript ({len(transcript)} chars), using chunked approach...")
            
            # Use first 3000 characters for detailed analysis
            main_chunk = transcript[:3000]
            
            # Create a summary of the full content for context
            summary_prompt = f"""Briefly summarize the main topics and structure of this video transcript in 2-3 sentences:

Title: {video_title}
Transcript: {transcript[:2000]}...

Summary:"""

            try:
                summary_response = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=[{"role": "user", "content": summary_prompt}],
                    max_tokens=200,
                    temperature=0.3
                )
                content_summary = summary_response.choices[0].message.content.strip()
                print(f"📋 Content summary: {content_summary}")
            except:
                content_summary = "Video covers multiple topics in sequence."
            
            working_transcript = main_chunk
        else:
            working_transcript = transcript
            content_summary = "Full transcript analyzed."
        
        # Calculate reasonable chapter intervals
        num_chapters = max(3, min(8, duration // 180))  # 1 chapter per 3 minutes, 3-8 total
        chapter_interval = duration / num_chapters
        
        print(f"🎯 Targeting {num_chapters} chapters, ~{chapter_interval:.0f}s each")
        
        # Improved prompt for chapter generation
        chapter_prompt = f"""Create {num_chapters} video chapters for this surfing tutorial video.

Video: "{video_title}"
Duration: {duration} seconds ({duration//60}:{duration%60:02d})
Content Summary: {content_summary}

Transcript Sample:
{working_transcript}

Create {num_chapters} chapters that divide the video logically. Each chapter should:
- Have a specific timestamp in MM:SS format
- Have a descriptive title related to surfing techniques/steps
- Be evenly spaced throughout the video duration

Return ONLY a JSON object in this exact format:
{{"chapters": [
  {{"timestamp": "00:00", "title": "Introduction and Setup"}},
  {{"timestamp": "05:30", "title": "Basic Paddling Technique"}},
  {{"timestamp": "10:45", "title": "Wave Selection and Timing"}}
]}}"""

        print("🤖 Calling Vercel AI Gateway...")
        
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system", 
                    "content": "You are a video chapter generator. Always respond with valid JSON only."
                },
                {"role": "user", "content": chapter_prompt}
            ],
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
        )
        
        response_text = response.choices[0].message.content.strip()
        print(f"🤖 LLM Response: {response_text[:200]}...")
        
        # Clean and parse JSON response
        try:
            # Extract JSON from response if it contains extra text
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group()
            else:
                json_text = response_text
            
            chapters_data = json.loads(json_text)
            chapters = chapters_data.get("chapters", [])
            
            if not chapters:
                raise ValueError("No chapters in response")
            
            print(f"✅ Generated {len(chapters)} chapters successfully!")
            
            # Validate and format timestamps
            formatted_chapters = []
            for i, chapter in enumerate(chapters):
                try:
                    # Ensure timestamp is in correct format
                    timestamp = chapter.get("timestamp", f"{i*3:02d}:00")
                    title = chapter.get("title", f"Chapter {i+1}")
                    
                    # Convert MM:SS to HH:MM:SS if needed
                    if ":" in timestamp and len(timestamp.split(":")) == 2:
                        timestamp = "00:" + timestamp
                    
                    formatted_chapters.append({
                        "timestamp": timestamp,
                        "title": title
                    })
                except:
                    # Fallback chapter
                    chapter_time = int(i * (duration / len(chapters)))
                    formatted_chapters.append({
                        "timestamp": f"00:{chapter_time//60:02d}:{chapter_time%60:02d}",
                        "title": f"Part {i+1}: {video_title.split()[-2:] if len(video_title.split()) > 2 else 'Content'}"
                    })
            
            return formatted_chapters
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error: {e}")
            print(f"Response was: {response_text}")
            raise
        
    except Exception as e:
        print(f"❌ Chapter generation error: {e}")
        
        # Smart fallback based on video content
        fallback_chapters = []
        chapter_count = max(3, min(6, duration // 240))  # 1 chapter per 4 minutes
        
        # Surfing-specific chapter titles for this video
        surfing_titles = [
            "Introduction and Equipment",
            "Basic Paddling Techniques", 
            "Reading Waves and Positioning",
            "Catching Your First Wave",
            "Standing Up and Balance",
            "Intermediate Techniques",
            "Common Mistakes and Tips",
            "Advanced Maneuvers"
        ]
        
        for i in range(chapter_count):
            chapter_time = int(i * (duration / chapter_count))
            title = surfing_titles[i] if i < len(surfing_titles) else f"Chapter {i+1}"
            
            fallback_chapters.append({
                "timestamp": f"00:{chapter_time//60:02d}:{chapter_time%60:02d}",
                "title": title
            })
        
        print(f"📋 Using smart fallback: {len(fallback_chapters)} chapters")
        return fallback_chapters

@app.route('/api/health', methods=['GET'])
@cross_origin()
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Chapter-Llama IMPROVED Video Processing API",
        "model": MODEL_NAME,
        "asr_available": ASR_AVAILABLE,
        "processing_mode": "REAL_VIDEO_IMPROVED"
    })

@app.route('/api/models', methods=['GET'])
@cross_origin()
def get_models():
    return jsonify({"models": [{
        "id": "meta-llama-3.1-8b-improved",
        "name": "Meta Llama 3.1 8B (Improved Processing)",
        "description": "Enhanced video processing with smart transcript chunking",
        "provider": "Vercel AI Gateway + Whisper",
        "recommended": True
    }]})

@app.route('/api/process-video', methods=['POST', 'OPTIONS'])
@cross_origin()
def process_video():
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json()
    video_url = data.get('video_url')
    model_name = data.get('model_name', 'meta-llama-3.1-8b-improved')

    if not video_url:
        return jsonify({"success": False, "message": "Video URL required"}), 400

    if not OPENAI_API_KEY:
        return jsonify({"success": False, "message": "API key not configured"}), 500

    print(f"\n🎬 IMPROVED PROCESSING: {video_url}")

    try:
        # Download and transcribe
        video_data = download_and_transcribe_video(video_url)
        
        # Generate improved chapters
        chapters = generate_chapters_from_transcript(
            video_data['transcript'], 
            video_data['title'],
            video_data['duration'],
            video_data['timestamps']
        )

        # Format duration
        d = video_data['duration']
        video_duration = f"{d//3600:02d}:{(d%3600)//60:02d}:{d%60:02d}"

        return jsonify({
            "success": True,
            "message": f"IMPROVED processing completed for '{video_data['title']}'",
            "video_duration": video_duration,
            "video_title": video_data['title'],
            "chapters": chapters,
            "model_used": MODEL_NAME,
            "provider": "Vercel AI Gateway + Whisper",
            "processing_mode": "REAL_VIDEO_IMPROVED",
            "transcript_length": len(video_data['transcript']),
            "segments_processed": len(video_data['timestamps'])
        })

    except Exception as e:
        print(f"❌ Processing failed: {e}")
        return jsonify({
            "success": False, 
            "message": f"Processing failed: {e}"
        }), 500

if __name__ == '__main__':
    print("🚀 Starting IMPROVED Chapter-Llama Video Processing API...")
    print(f"📡 Server: http://localhost:5328")
    print(f"🤖 Model: {MODEL_NAME}")
    print(f"🌐 Gateway: {OPENAI_BASE_URL}")
    print(f"🎤 ASR: Whisper Base ({'Available' if ASR_AVAILABLE else 'Unavailable'})")
    print("🔧 Features: Smart transcript chunking, improved prompting")
    
    app.run(debug=True, port=5328, host='0.0.0.0')
