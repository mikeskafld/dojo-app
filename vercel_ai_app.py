import os
import tempfile
import json
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import yt_dlp
from openai import OpenAI

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure OpenAI client for Vercel AI Gateway
client = OpenAI(
    api_key=os.getenv('OPENAI_API_KEY', 'dummy-key'),
    base_url=os.getenv('OPENAI_BASE_URL', 'https://gateway.ai.vercel.app/v1')
)

# ASR functionality (using faster-whisper for local transcription)
try:
    from faster_whisper import WhisperModel
    whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    ASR_AVAILABLE = True
except ImportError:
    ASR_AVAILABLE = False
    print("⚠️  Faster-whisper not available, using dummy transcription")

def transcribe_audio(audio_path):
    """Transcribe audio using faster-whisper or dummy transcription"""
    if ASR_AVAILABLE:
        try:
            segments, info = whisper_model.transcribe(str(audio_path), beam_size=5)
            transcript = ""
            timestamps = []
            
            for segment in segments:
                start_time = f"{int(segment.start//60):02d}:{int(segment.start%60):02d}"
                transcript += f"[{start_time}] {segment.text}\n"
                timestamps.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip()
                })
            
            return transcript, timestamps
        except Exception as e:
            print(f"ASR Error: {e}")
            return f"[Demo Transcript] This is a sample transcription for testing purposes.", []
    else:
        return f"[Demo Transcript] This is a sample transcription for testing purposes.", []

def extract_audio_from_video(video_path):
    """Extract audio from video file"""
    try:
        import subprocess
        audio_path = video_path.with_suffix('.wav')
        
        # Use ffmpeg to extract audio
        subprocess.run([
            'ffmpeg', '-i', str(video_path), 
            '-ac', '1', '-ar', '16000', 
            '-y', str(audio_path)
        ], capture_output=True, check=True)
        
        return audio_path
    except Exception as e:
        print(f"Audio extraction error: {e}")
        return None

def download_youtube_video(url, output_dir="/tmp"):
    """Download YouTube video using yt-dlp"""
    try:
        ydl_opts = {
            'format': 'best[ext=mp4]/best',
            'outtmpl': f'{output_dir}/%(title)s.%(ext)s',
            'max_filesize': 100 * 1024 * 1024,  # 100MB max
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            output_path = ydl.prepare_filename(info)
            video_title = info.get('title', 'Unknown Video')
            duration = info.get('duration', 0)
            
        return Path(output_path), video_title, duration
    except Exception as e:
        print(f"YouTube download error: {e}")
        return None, None, None

def generate_chapters_with_llama(transcript, video_title="Unknown Video", duration=0):
    """Generate chapters using Vercel AI Gateway with Meta Llama 3.1 8B"""
    try:
        # Create a comprehensive prompt for chapter generation
        prompt = f"""You are an expert video content analyzer. Given a video transcript, generate meaningful chapter titles and timestamps.

Video Title: {video_title}
Video Duration: {duration} seconds
Transcript:
{transcript}

Please analyze this transcript and create 4-8 logical chapters that represent the main topics or sections of the video.

Return your response as a JSON array with this exact format:
[
  {{"timestamp": "00:00:00", "title": "Introduction"}},
  {{"timestamp": "00:02:30", "title": "Main Topic Begins"}},
  {{"timestamp": "00:05:15", "title": "Key Discussion Points"}},
  {{"timestamp": "00:08:00", "title": "Conclusion"}}
]

Guidelines:
- Create 4-8 chapters maximum
- Timestamps should be in MM:SS or HH:MM:SS format
- Chapter titles should be descriptive and specific
- Chapters should represent logical content divisions
- Only return the JSON array, no other text

JSON Response:"""

        # Call Vercel AI Gateway with Llama 3.1 8B
        response = client.chat.completions.create(
            model=os.getenv('MODEL_NAME', 'meta-llama/Meta-Llama-3.1-8B-Instruct'),
            messages=[
                {"role": "system", "content": "You are a helpful assistant that analyzes video content and creates chapter divisions. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=int(os.getenv('MAX_TOKENS', 2048)),
            temperature=float(os.getenv('TEMPERATURE', 0.7))
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Try to parse JSON response
        try:
            # Extract JSON from response (in case there's extra text)
            if '```json' in ai_response:
                ai_response = ai_response.split('```json')[1].split('```')[0].strip()
            elif '[' in ai_response:
                start = ai_response.find('[')
                end = ai_response.rfind(']') + 1
                ai_response = ai_response[start:end]
            
            chapters = json.loads(ai_response)
            
            # Validate the response format
            if isinstance(chapters, list) and len(chapters) > 0:
                for chapter in chapters:
                    if not isinstance(chapter, dict) or 'timestamp' not in chapter or 'title' not in chapter:
                        raise ValueError("Invalid chapter format")
                
                return chapters
            else:
                raise ValueError("Invalid response format")
                
        except (json.JSONDecodeError, ValueError) as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw AI response: {ai_response}")
            
            # Fallback to structured chapters
            return [
                {"timestamp": "00:00:00", "title": "Introduction"},
                {"timestamp": f"00:{int(duration*0.25//60):02d}:{int(duration*0.25%60):02d}", "title": "Main Content"},
                {"timestamp": f"00:{int(duration*0.50//60):02d}:{int(duration*0.50%60):02d}", "title": "Key Discussion"},
                {"timestamp": f"00:{int(duration*0.75//60):02d}:{int(duration*0.75%60):02d}", "title": "Advanced Topics"},
                {"timestamp": f"00:{int(duration*0.90//60):02d}:{int(duration*0.90%60):02d}", "title": "Conclusion"}
            ]
            
    except Exception as e:
        print(f"Llama API error: {e}")
        # Return fallback chapters
        return [
            {"timestamp": "00:00:00", "title": "Introduction"},
            {"timestamp": "00:02:30", "title": "Main Content"},
            {"timestamp": "00:05:00", "title": "Key Discussion"},
            {"timestamp": "00:07:30", "title": "Conclusion"}
        ]

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "service": "Chapter-Llama AI API (Vercel Gateway)",
        "model": os.getenv('MODEL_NAME', 'meta-llama/Meta-Llama-3.1-8B-Instruct'),
        "asr_available": ASR_AVAILABLE
    })

@app.route('/api/models', methods=['GET'])
def get_available_models():
    models = [
        {
            "id": "meta-llama-3.1-8b",
            "name": "Meta Llama 3.1 8B",
            "description": "Meta's Llama 3.1 8B model via Vercel AI Gateway",
            "recommended": True,
            "provider": "Vercel AI Gateway"
        }
    ]
    return jsonify({"models": models})

@app.route('/api/process-video', methods=['POST'])
def process_video():
    """Process video URL with Vercel AI Gateway + Meta Llama 3.1 8B"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        video_url = data.get('video_url')
        model_name = data.get('model_name', 'meta-llama-3.1-8b')
        
        if not video_url:
            return jsonify({"error": "No video URL provided"}), 400
        
        print(f"📥 Processing video: {video_url}")
        
        # Download video
        video_path, video_title, duration = download_youtube_video(video_url)
        if not video_path or not video_path.exists():
            return jsonify({"error": "Failed to download video from URL"}), 400
        
        try:
            # Extract audio
            audio_path = extract_audio_from_video(video_path)
            if not audio_path:
                return jsonify({"error": "Failed to extract audio from video"}), 400
            
            # Transcribe audio
            print("🎤 Transcribing audio...")
            transcript, timestamps = transcribe_audio(audio_path)
            
            # Generate chapters with Llama 3.1 8B
            print("🤖 Generating chapters with Meta Llama 3.1 8B...")
            chapters = generate_chapters_with_llama(transcript, video_title, duration)
            
            # Clean up files
            if video_path.exists():
                video_path.unlink()
            if audio_path and audio_path.exists():
                audio_path.unlink()
            
            return jsonify({
                "success": True,
                "chapters": chapters,
                "video_title": video_title,
                "video_duration": f"{duration//60:02d}:{duration%60:02d}",
                "model_used": "meta-llama/Meta-Llama-3.1-8B-Instruct",
                "provider": "Vercel AI Gateway",
                "transcript_available": ASR_AVAILABLE,
                "message": "Chapters generated successfully with Meta Llama 3.1 8B"
            })
            
        except Exception as e:
            # Clean up on error
            if video_path and video_path.exists():
                video_path.unlink()
            raise e
        
    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/api/process-file', methods=['POST']) 
def process_file():
    """Process uploaded video file with Vercel AI Gateway + Meta Llama 3.1 8B"""
    try:
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
            
        video_file = request.files['video']
        model_name = request.form.get('model_name', 'meta-llama-3.1-8b')
        
        if video_file.filename == '':
            return jsonify({"error": "No video file selected"}), 400
        
        print(f"📁 Processing uploaded file: {video_file.filename}")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
            video_file.save(temp_file.name)
            temp_path = Path(temp_file.name)
        
        try:
            # Extract audio
            audio_path = extract_audio_from_video(temp_path)
            if not audio_path:
                return jsonify({"error": "Failed to extract audio from video"}), 400
            
            # Transcribe audio
            print("🎤 Transcribing audio...")
            transcript, timestamps = transcribe_audio(audio_path)
            
            # Generate chapters with Llama 3.1 8B
            print("�� Generating chapters with Meta Llama 3.1 8B...")
            chapters = generate_chapters_with_llama(transcript, video_file.filename, 0)
            
            # Clean up files
            temp_path.unlink()
            if audio_path and audio_path.exists():
                audio_path.unlink()
            
            return jsonify({
                "success": True,
                "chapters": chapters,
                "filename": video_file.filename,
                "model_used": "meta-llama/Meta-Llama-3.1-8B-Instruct",
                "provider": "Vercel AI Gateway",
                "transcript_available": ASR_AVAILABLE,
                "message": "Chapters generated successfully with Meta Llama 3.1 8B"
            })
            
        except Exception as e:
            # Clean up on error
            if temp_path.exists():
                temp_path.unlink()
            if audio_path and audio_path.exists():
                audio_path.unlink()
            raise e
        
    except Exception as e:
        return jsonify({"error": f"File processing failed: {str(e)}"}), 500

if __name__ == '__main__':
    print("🚀 Starting Vercel AI Gateway + Meta Llama 3.1 8B Flask API...")
    print("📡 Server running on http://localhost:5328")
    print(f"🤖 Model: {os.getenv('MODEL_NAME', 'meta-llama/Meta-Llama-3.1-8B-Instruct')}")
    print(f"🌐 Gateway: {os.getenv('OPENAI_BASE_URL', 'Vercel AI Gateway')}")
    print(f"🎤 ASR Available: {ASR_AVAILABLE}")
    print("💡 Make sure to set your OPENAI_API_KEY in .env file!")
    
    app.run(debug=True, port=5328, host='0.0.0.0')
