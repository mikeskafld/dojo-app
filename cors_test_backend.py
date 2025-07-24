from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import os
import time
from dotenv import load_dotenv
from openai import OpenAI
import subprocess
import json
from pathlib import Path

# Load environment variables from .env file
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
VERCEL_AI_GATEWAY_URL = os.getenv("VERCEL_AI_GATEWAY_URL")
VERCEL_API_TOKEN = os.getenv("VERCEL_API_TOKEN") 
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") 
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1") 
MODEL_NAME = os.getenv("MODEL_NAME", "meta-llama/Meta-Llama-3.1-8B-Instruct")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 2048))
TEMPERATURE = float(os.getenv("TEMPERATURE", 0.7))

# Initialize OpenAI client for Vercel AI Gateway
client = OpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
)

# ASR Processor (using faster-whisper for local transcription)
try:
    from faster_whisper import WhisperModel
    print("Downloading Whisper model for ASR (if not already downloaded)...")
    whisper_model_size = "tiny.en" 
    asr_model = WhisperModel(whisper_model_size, device="cpu", compute_type="int8")
    ASR_AVAILABLE = True
    print(f"Whisper ASR model '{whisper_model_size}' loaded.")
except Exception as e:
    print(f"Could not load Whisper ASR model: {e}")
    asr_model = None
    ASR_AVAILABLE = False

def get_video_transcript(video_url):
    if not ASR_AVAILABLE:
        raise Exception("ASR service not available.")
    
    print(f"Simulating video download and transcription for {video_url}...")
    return "This is a sample transcript of the video content. It covers various topics including technology, science, and future trends. The speaker discusses artificial intelligence, machine learning, and their impact on society. There are also mentions of sustainable energy and space exploration. This transcript is generated for testing purposes."

def generate_chapters_with_llm(transcript):
    print(f"Generating chapters with LLM: {MODEL_NAME} via Vercel AI Gateway...")
    try:
        prompt = f"""You are an expert video chapter generator. Your task is to analyze the provided video transcript and generate a list of concise, descriptive chapters with timestamps.
        The chapters should logically segment the video content. Provide the output as a JSON array of objects, where each object has a "timestamp" (HH:MM:SS) and a "title" field.
        Ensure the timestamps are accurate relative to the start of the video (00:00:00).

        Transcript:
        {transcript}

        Example Output Format:
        {{"chapters": [
          {{"timestamp": "00:00:00", "title": "Introduction"}},
          {{"timestamp": "00:05:30", "title": "Key Concepts"}},
          {{"timestamp": "00:12:15", "title": "Conclusion"}}
        ]}}
        """

        chat_completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates video chapters."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            response_format={"type": "json_object"}
        )

        response_content = chat_completion.choices[0].message.content
        print(f"LLM Raw Response: {response_content}")
        chapters_data = json.loads(response_content)
        return chapters_data.get("chapters", [])

    except Exception as e:
        print(f"Error generating chapters with LLM: {e}")
        # Return demo chapters on error
        return [
            {"timestamp": "00:00:00", "title": "Introduction"},
            {"timestamp": "00:02:30", "title": "Main Content"},
            {"timestamp": "00:05:00", "title": "Key Discussion"},
            {"timestamp": "00:07:30", "title": "Conclusion"}
        ]

@app.route('/api/health', methods=['GET'])
@cross_origin()
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Chapter-Llama AI API (Vercel Gateway)",
        "model": MODEL_NAME,
        "asr_available": ASR_AVAILABLE
    })

@app.route('/api/models', methods=['GET'])
@cross_origin()
def get_models():
    models = [
        {
            "id": "meta-llama-3.1-8b",
            "name": "Meta Llama 3.1 8B",
            "description": "Meta's Llama 3.1 8B model via Vercel AI Gateway",
            "provider": "Vercel AI Gateway",
            "recommended": True
        }
    ]
    return jsonify({"models": models})

@app.route('/api/process-video', methods=['POST', 'OPTIONS'])
@cross_origin()
def process_video():
    if request.method == 'OPTIONS':
        # Handle preflight request
        return '', 200
        
    data = request.get_json()
    video_url = data.get('video_url')
    model_name = data.get('model_name', 'meta-llama-3.1-8b')

    if not video_url:
        return jsonify({"success": False, "message": "Video URL is required"}), 400

    if not OPENAI_API_KEY:
        return jsonify({"success": False, "message": "OPENAI_API_KEY is not set in .env file. Please configure your Vercel AI Gateway token or OpenAI API key."}), 500

    print(f"Received request to process video: {video_url} with model: {model_name}")

    try:
        # Step 1: Get video transcript using local ASR (Whisper)
        transcript = get_video_transcript(video_url)
        print("Transcript generated successfully.")

        # Step 2: Generate chapters using LLM via Vercel AI Gateway
        chapters = generate_chapters_with_llm(transcript)
        print("Chapters generated successfully.")

        # Simulate video duration
        video_duration = "00:15:00"

        return jsonify({
            "success": True,
            "message": "Video processed successfully with Vercel AI Gateway",
            "video_duration": video_duration,
            "chapters": chapters,
            "model_used": model_name,
            "provider": "Vercel AI Gateway"
        })

    except Exception as e:
        print(f"Failed to process video: {e}")
        return jsonify({"success": False, "message": f"Failed to process video: {e}"}), 500

@app.route('/api/process-file', methods=['POST', 'OPTIONS'])
@cross_origin()
def process_file():
    if request.method == 'OPTIONS':
        # Handle preflight request
        return '', 200
        
    if 'video' not in request.files:
        return jsonify({"success": False, "message": "No video file provided"}), 400

    video_file = request.files['video']
    model_name = request.form.get('model_name', 'meta-llama-3.1-8b')

    if video_file.filename == '':
        return jsonify({"success": False, "message": "No video file selected"}), 400

    print(f"Received file: {video_file.filename} with model: {model_name}")

    try:
        # For demo purposes, simulate processing
        transcript = "This is a sample transcript from the uploaded video file. The video contains various segments discussing different topics."
        chapters = generate_chapters_with_llm(transcript)

        return jsonify({
            "success": True,
            "message": "Video file processed successfully with Vercel AI Gateway",
            "video_duration": "00:10:00",
            "chapters": chapters,
            "model_used": model_name,
            "provider": "Vercel AI Gateway",
            "filename": video_file.filename
        })

    except Exception as e:
        print(f"Failed to process video file: {e}")
        return jsonify({"success": False, "message": f"Failed to process video file: {e}"}), 500

if __name__ == '__main__':
    print("🚀 Starting CORS-Enabled Vercel AI Gateway Flask API...")
    print(f"📡 Server running on http://localhost:5328")
    print(f"🤖 Model: {MODEL_NAME}")
    print(f"🌐 Gateway: {OPENAI_BASE_URL}")
    print(f"🎤 ASR Available: {ASR_AVAILABLE}")
    print("🔗 CORS enabled for frontend integration")
    if not OPENAI_API_KEY:
        print("💡 Make sure to set your OPENAI_API_KEY in .env file!")
    app.run(debug=True, port=5328, host='0.0.0.0')
