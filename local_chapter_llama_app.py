import os
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

# Set environment variables for memory management
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:128'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

# Chapter-Llama imports
from src.data.single_video import SingleVideo
from src.data.utils_asr import PromptASR
from src.models.llama_inference import LlamaInference
from src.test.vidchapters import get_chapters
from tools.download.models import download_model

app = Flask(__name__)
CORS(app)

# Global model cache with memory management
model_cache = {}
OFFLOAD_DIR = "/tmp/model_offload"

def init_model_with_memory_management(model_name="asr-10k"):
    """Initialize model with proper memory management"""
    if model_name not in model_cache:
        print(f"🔄 Loading Chapter-Llama model: {model_name}")
        try:
            # Download the model weights
            model_path = download_model(model_name)
            print(f"📦 Model path: {model_path}")
            
            # Initialize inference model with memory optimizations
            inference = LlamaInference(
                ckpt_path="meta-llama/Llama-3.1-8B-Instruct", 
                peft_model=model_path,
                offload_dir=OFFLOAD_DIR,  # Add offload directory
                load_in_8bit=True,  # Use 8-bit quantization
                device_map="auto"  # Automatic device mapping
            )
            
            model_cache[model_name] = inference
            print(f"✅ Model {model_name} loaded successfully with memory optimization")
            return inference
            
        except Exception as e:
            print(f"❌ Error loading model {model_name}: {str(e)}")
            # Try with simplified configuration
            try:
                print("🔄 Retrying with simplified configuration...")
                inference = LlamaInference(
                    ckpt_path="meta-llama/Llama-3.1-8B-Instruct", 
                    peft_model=model_path
                )
                model_cache[model_name] = inference
                print(f"✅ Model {model_name} loaded with simplified config")
                return inference
            except Exception as e2:
                print(f"❌ Simplified config also failed: {str(e2)}")
                return None
    
    return model_cache[model_name]

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

def process_video_with_local_model(video_path, model_name="asr-10k"):
    """Process video with local Chapter-Llama model"""
    try:
        # Initialize the model
        inference = init_model_with_memory_management(model_name)
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
        
        print("🤖 Generating chapters with local AI model...")
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
            "message": "Chapter generation completed successfully with local model"
        }
        
    except Exception as e:
        print(f"❌ Error processing video: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to process video with local Chapter-Llama"
        }

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "service": "Chapter-Llama Local AI API",
        "offload_dir": OFFLOAD_DIR,
        "models_cached": list(model_cache.keys())
    })

@app.route('/api/models', methods=['GET'])
def get_available_models():
    models = [
        {
            "id": "asr-1k",
            "name": "ASR-1k", 
            "description": "ASR-trained model (1k samples) - fastest local inference",
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
        }
    ]
    return jsonify({"models": models})

@app.route('/api/process-video', methods=['POST'])
def process_video():
    """Process video URL with local Chapter-Llama AI model"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        video_url = data.get('video_url')
        model_name = data.get('model_name', 'asr-10k')
        
        if not video_url:
            return jsonify({"error": "No video URL provided"}), 400
        
        print(f"📥 Processing request: {video_url} with local model {model_name}")
        
        # Download video from URL
        video_path, video_title, duration = download_youtube_video(video_url)
        if video_path is None or not video_path.exists():
            return jsonify({"error": "Failed to download video from URL"}), 400
        
        try:
            # Process with local Chapter-Llama
            result = process_video_with_local_model(video_path, model_name)
            
            # Clean up downloaded video
            video_path.unlink(missing_ok=True)
            
            if result["success"]:
                return jsonify(result)
            else:
                return jsonify(result), 500
                
        finally:
            # Ensure cleanup
            if video_path and video_path.exists():
                video_path.unlink(missing_ok=True)
        
    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/api/process-file', methods=['POST']) 
def process_file():
    """Process uploaded video file with local Chapter-Llama AI model"""
    try:
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
            
        video_file = request.files['video']
        model_name = request.form.get('model_name', 'asr-10k')
        
        if video_file.filename == '':
            return jsonify({"error": "No video file selected"}), 400
        
        print(f"📁 Processing uploaded file: {video_file.filename} with local model {model_name}")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
            video_file.save(temp_file.name)
            temp_path = Path(temp_file.name)
        
        try:
            # Process with local Chapter-Llama
            result = process_video_with_local_model(temp_path, model_name)
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
    print("🚀 Starting Local Chapter-Llama Flask API...")
    print("📡 Server running on http://localhost:5328")
    print("🤖 Local AI-powered chapter generation enabled")
    print("💾 Memory optimization and offload directory configured")
    print("🔧 PEFT compatibility issues resolved")
    
    app.run(debug=True, port=5328, host='0.0.0.0')
