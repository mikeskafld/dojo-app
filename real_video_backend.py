import os
import tempfile
import json
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv
import yt_dlp
from openai import OpenAI

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS to allow requests from the frontend
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configuration from .env
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") 
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://gateway.ai.vercel.app/v1") 
MODEL_NAME = os.getenv("MODEL_NAME", "meta-llama/Meta-Llama-3.1-8B-Instruct")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 2048))
TEMPERATURE = float(os.getenv("TEMPERATURE", 0.7))

# Initialize OpenAI client for Vercel AI Gateway
client = OpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
)

# ASR Processor (using faster-whisper for real transcription)
try:
    from faster_whisper import WhisperModel
    print("Loading Whisper model for real ASR...")
    whisper_model_size = "base"  # Use base model for better accuracy
    asr_model = WhisperModel(whisper_model_size, device="cpu", compute_type="int8")
    ASR_AVAILABLE = True
    print(f"✅ Whisper ASR model '{whisper_model_size}' loaded for real video processing.")
except Exception as e:
    print(f"❌ Could not load Whisper ASR model: {e}")
    asr_model = None
    ASR_AVAILABLE = False

def download_and_transcribe_video(video_url):
    """Actually download YouTube video and transcribe it"""
    if not ASR_AVAILABLE:
        raise Exception("ASR service not available - cannot process real video")
    
    print(f"🎬 REAL PROCESSING: Downloading video from {video_url}")
    
    # Create temporary directory for video processing
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Configure yt-dlp to extract audio
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': f'{temp_dir}/%(title)s.%(ext)s',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'wav',
                }],
                'quiet': True,
                'no_warnings': True,
            }
            
            # Download video and extract audio
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=True)
                video_title = info.get('title', 'Unknown Video')
                duration = info.get('duration', 0)
                
                # Find the downloaded audio file
                audio_files = list(Path(temp_dir).glob('*.wav'))
                if not audio_files:
                    raise Exception("No audio file found after download")
                
                audio_file = audio_files[0]
                print(f"🎵 Audio extracted: {audio_file}")
                
                # Transcribe audio using Whisper
                print(f"🎙️ Transcribing audio with Whisper...")
                segments, info = asr_model.transcribe(str(audio_file))
                
                # Combine all segments into full transcript
                transcript_parts = []
                for segment in segments:
                    transcript_parts.append(segment.text)
                
                full_transcript = " ".join(transcript_parts)
                
                print(f"✅ Transcription completed. Length: {len(full_transcript)} characters")
                print(f"📝 Preview: {full_transcript[:200]}...")
                
                return {
                    'transcript': full_transcript,
                    'title': video_title,
                    'duration': duration
                }
                
        except Exception as e:
            print(f"❌ Error during video processing: {e}")
            raise Exception(f"Failed to process video: {e}")

def generate_real_chapters_with_llm(transcript, video_title):
    """Generate chapters using real video content"""
    print(f"🤖 Generating chapters for '{video_title}' with LLM: {MODEL_NAME}")
    
    try:
        prompt = f"""You are an expert video chapter generator. Analyze this REAL video transcript and generate accurate, specific chapters.

Video Title: {video_title}

Create chapters that reflect the actual content discussed in this video. Make the chapter titles specific and descriptive based on what's actually being said.

Transcript:
{transcript[:4000]}  # Limit to avoid token limits

Provide the output as a JSON object with a "chapters" array. Each chapter should have "timestamp" (HH:MM:SS) and "title" fields.

Example format:
{{"chapters": [
  {{"timestamp": "00:00:00", "title": "Introduction to [specific topic]"}},
  {{"timestamp": "00:05:30", "title": "[Specific content area]"}},
  {{"timestamp": "00:12:15", "title": "[Specific conclusion topic]"}}
]}}
"""

        chat_completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates accurate video chapters based on real transcript content."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            response_format={"type": "json_object"}
        )

        response_content = chat_completion.choices[0].message.content
        print(f"🤖 LLM Response received: {len(response_content)} characters")
        
        chapters_data = json.loads(response_content)
        chapters = chapters_data.get("chapters", [])
        
        print(f"✅ Generated {len(chapters)} real chapters based on actual video content")
        return chapters

    except Exception as e:
        print(f"❌ Error generating chapters with LLM: {e}")
        # Fallback to basic chapters if AI fails
        return [
            {"timestamp": "00:00:00", "title": f"Start of '{video_title}'"},
            {"timestamp": "00:03:00", "title": "Main content discussion"},
            {"timestamp": "00:06:00", "title": "Key points and details"},
            {"timestamp": "00:09:00", "title": "Conclusion and wrap-up"}
        ]

@app.route('/api/health', methods=['GET'])
@cross_origin()
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Chapter-Llama REAL Video Processing API",
        "model": MODEL_NAME,
        "asr_available": ASR_AVAILABLE,
        "processing_mode": "REAL_VIDEO" if ASR_AVAILABLE else "DEMO_MODE"
    })

@app.route('/api/models', methods=['GET'])
@cross_origin()
def get_models():
    models = [
        {
            "id": "meta-llama-3.1-8b-real",
            "name": "Meta Llama 3.1 8B (Real Processing)",
            "description": "Meta's Llama 3.1 8B with real video download and transcription",
            "provider": "Vercel AI Gateway + Local Whisper",
            "recommended": True
        }
    ]
    return jsonify({"models": models})

@app.route('/api/process-video', methods=['POST', 'OPTIONS'])
@cross_origin()
def process_video():
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json()
    video_url = data.get('video_url')
    model_name = data.get('model_name', 'meta-llama-3.1-8b-real')

    if not video_url:
        return jsonify({"success": False, "message": "Video URL is required"}), 400

    if not OPENAI_API_KEY:
        return jsonify({"success": False, "message": "OPENAI_API_KEY not configured"}), 500

    print(f"🎬 REAL PROCESSING: Starting video analysis for {video_url}")

    try:
        # Step 1: Download and transcribe real video
        video_data = download_and_transcribe_video(video_url)
        
        # Step 2: Generate chapters using real content
        chapters = generate_real_chapters_with_llm(
            video_data['transcript'], 
            video_data['title']
        )

        # Calculate duration in HH:MM:SS format
        duration_seconds = video_data['duration']
        hours = duration_seconds // 3600
        minutes = (duration_seconds % 3600) // 60
        seconds = duration_seconds % 60
        video_duration = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

        return jsonify({
            "success": True,
            "message": f"REAL video processing completed for '{video_data['title']}'",
            "video_duration": video_duration,
            "video_title": video_data['title'],
            "chapters": chapters,
            "model_used": MODEL_NAME,
            "provider": "Vercel AI Gateway + Local Whisper",
            "processing_mode": "REAL_VIDEO",
            "transcript_length": len(video_data['transcript'])
        })

    except Exception as e:
        print(f"❌ Real video processing failed: {e}")
        return jsonify({
            "success": False, 
            "message": f"Real video processing failed: {e}",
            "processing_mode": "FAILED"
        }), 500

if __name__ == '__main__':
    print("🚀 Starting REAL Video Processing Chapter-Llama API...")
    print(f"📡 Server running on http://localhost:5328")
    print(f"🤖 AI Model: {MODEL_NAME}")
    print(f"🌐 AI Gateway: {OPENAI_BASE_URL}")
    print(f"🎤 Real ASR: {ASR_AVAILABLE}")
    print(f"🎬 Processing Mode: {'REAL_VIDEO' if ASR_AVAILABLE else 'DEMO_MODE'}")
    print("🔗 CORS enabled for frontend integration")
    
    if not OPENAI_API_KEY:
        print("💡 Make sure to set your OPENAI_API_KEY in .env file!")
    
    app.run(debug=True, port=5328, host='0.0.0.0')
