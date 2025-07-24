import os
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

# Chapter-Llama imports
from src.data.single_video import SingleVideo
from src.data.utils_asr import PromptASR
from src.models.llama_inference import LlamaInference
from src.test.vidchapters import get_chapters
from tools.download.models import download_model

app = Flask(__name__)
CORS(app)

# Global model cache
model_cache = {}

def init_model(model_name="asr-10k"):
    """Initialize and cache the Chapter-Llama model"""
    if model_name not in model_cache:
        print(f"🔄 Loading Chapter-Llama model: {model_name}")
        try:
            # Download the model weights
            model_path = download_model(model_name)
            
            # Initialize inference model
            inference = LlamaInference(
                ckpt_path="meta-llama/Llama-3.1-8B-Instruct", 
                peft_model=model_path
            )
            
            model_cache[model_name] = inference
            print(f"✅ Model {model_name} loaded successfully")
            return inference
            
        except Exception as e:
            print(f"❌ Error loading model {model_name}: {str(e)}")
            return None
    
    return model_cache[model_name]

def download_youtube_video(url, output_dir="/tmp"):
    """Download YouTube video using yt-dlp"""
    output_path = None
    
    ydl_opts = {
        'format': 'best[ext=mp4]',
        'outtmpl': f'{output_dir}/%(title)s.%(ext)s',
        'max_filesize': 500 * 1024 * 1024,  # 500MB max
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            output_path = ydl.prepare_filename(info)
            
        return Path(output_path)
    except Exception as e:
        print(f"Error downloading YouTube video: {str(e)}")
        return None

def process_video_with_model(video_path, model_name="asr-10k"):
    """Process video with Chapter-Llama model"""
    try:
        # Initialize the model
        inference = init_model(model_name)
        if inference is None:
            raise Exception(f"Failed to load model: {model_name}")
        
        # Process video with SingleVideo
        print(f"🎥 Processing video: {video_path}")
        single_video = SingleVideo(video_path)
        prompt = PromptASR(chapters=single_video)
        
        vid_id = single_video.video_ids[0]
        prompt_text = prompt.get_prompt_test(vid_id)
        transcript = single_video.get_asr(vid_id)
        full_prompt = prompt_text + transcript
        
        print("🤖 Generating chapters with AI model...")
        output_text, chapters = get_chapters(
            inference,
            full_prompt,
            max_new_tokens=1024,
            do_sample=False,
            vid_id=vid_id,
        )
        
        # Format chapters for frontend
        chapter_list = []
        for timestamp, title in chapters.items():
            chapter_list.append({
                "timestamp": timestamp,
                "title": title
            })
        
        return {
            "success": True,
            "chapters": chapter_list,
            "video_duration": single_video.duration,
            "model_used": model_name,
            "transcript_length": len(transcript),
            "message": "Chapter generation completed successfully"
        }
        
    except Exception as e:
        print(f"❌ Error processing video: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to process video with Chapter-Llama"
        }

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "Chapter-Llama AI API"})

@app.route('/api/models', methods=['GET'])
def get_available_models():
    models = [
        {
            "id": "asr-1k",
            "name": "ASR-1k", 
            "description": "ASR-trained model (1k samples) - faster inference",
            "recommended": False
        },
        {
            "id": "asr-10k",
            "name": "ASR-10k",
            "description": "ASR-trained model (10k samples) - balanced performance", 
            "recommended": True
        },
        {
            "id": "captions_asr-1k",
            "name": "Captions+ASR-1k",
            "description": "Combined captions and ASR model (1k samples)",
            "recommended": False
        },
        {
            "id": "captions_asr-10k",
            "name": "Captions+ASR-10k", 
            "description": "Combined captions and ASR model (10k samples) - highest accuracy",
            "recommended": False
        }
    ]
    return jsonify({"models": models})

@app.route('/api/process-video', methods=['POST'])
def process_video():
    """Process video URL with Chapter-Llama AI model"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        video_url = data.get('video_url')
        model_name = data.get('model_name', 'asr-10k')
        
        if not video_url:
            return jsonify({"error": "No video URL provided"}), 400
        
        print(f"📥 Processing request: {video_url} with model {model_name}")
        
        # Download video from URL
        video_path = download_youtube_video(video_url)
        if video_path is None or not video_path.exists():
            return jsonify({"error": "Failed to download video from URL"}), 400
        
        try:
            # Process with Chapter-Llama
            result = process_video_with_model(video_path, model_name)
            
            # Clean up downloaded video
            video_path.unlink(missing_ok=True)
            
            if result["success"]:
                return jsonify(result)
            else:
                return jsonify(result), 500
                
        finally:
            # Ensure cleanup
            if video_path.exists():
                video_path.unlink(missing_ok=True)
        
    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/api/process-file', methods=['POST']) 
def process_file():
    """Process uploaded video file with Chapter-Llama AI model"""
    try:
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
            
        video_file = request.files['video']
        model_name = request.form.get('model_name', 'asr-10k')
        
        if video_file.filename == '':
            return jsonify({"error": "No video file selected"}), 400
        
        print(f"📁 Processing uploaded file: {video_file.filename} with model {model_name}")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
            video_file.save(temp_file.name)
            temp_path = Path(temp_file.name)
        
        try:
            # Process with Chapter-Llama
            result = process_video_with_model(temp_path, model_name)
            result["filename"] = video_file.filename
            
            if result["success"]:
                return jsonify(result)
            else:
                return jsonify(result), 500
                
        finally:
            # Clean up temp file
            temp_path.unlink(missing_ok=True)
        
    except Exception as e:
        return jsonify({"error": f"File processing failed: {str(e)}"}), 500

if __name__ == '__main__':
    print("🚀 Starting Chapter-Llama AI Flask API...")
    print("📡 Server running on http://localhost:5328")
    print("🤖 Real AI-powered chapter generation enabled")
    print("💡 First request will download models - please be patient!")
    
    # Preload default model for faster first request (optional)
    # print("🔄 Preloading default model...")
    # init_model("asr-10k")
    # print("✅ Default model preloaded")
    
    app.run(debug=True, port=5328, host='0.0.0.0')
