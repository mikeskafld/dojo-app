import os
import tempfile
import asyncio
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

# Import Chapter-Llama components
import sys
sys.path.append('..')
from src.data.single_video import SingleVideo
from src.data.utils_asr import PromptASR
from src.models.llama_inference import LlamaInference
from src.test.vidchapters import get_chapters
from tools.download.models import download_model

app = Flask(__name__)
CORS(app)

# Global model cache
model_cache = {}
current_model = None

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "Chapter-Llama API"})

@app.route('/api/models', methods=['GET'])
def get_available_models():
    """Get list of available Chapter-Llama models"""
    models = [
        {
            "id": "asr-10k",
            "name": "ASR-10k",
            "description": "ASR-trained model for speech-based frame selection",
            "recommended": False
        },
        {
            "id": "captions_asr-10k", 
            "name": "Captions+ASR-10k",
            "description": "Combined captions and ASR model (primary model)",
            "recommended": True
        },
        {
            "id": "captions_asr-1k",
            "name": "Captions+ASR-1k", 
            "description": "Smaller training set variant for testing",
            "recommended": False
        }
    ]
    return jsonify({"models": models})

@app.route('/api/process-video', methods=['POST'])
def process_video():
    """Process video file or URL and generate chapters"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        video_url = data.get('video_url')
        model_name = data.get('model_name', 'asr-10k')
        do_sample = data.get('do_sample', False)
        
        if not video_url:
            return jsonify({"error": "No video URL provided"}), 400
        
        # Load model if not cached
        global current_model
        if current_model is None or current_model != model_name:
            try:
                model_path = download_model(model_name)
                inference_model = LlamaInference(
                    ckpt_path="meta-llama/Llama-3.1-8B-Instruct",
                    peft_model=model_path
                )
                model_cache[model_name] = inference_model
                current_model = model_name
            except Exception as e:
                return jsonify({"error": f"Failed to load model: {str(e)}"}), 500
        
        inference_model = model_cache[model_name]
        
        # Create temporary directory for video processing
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_video_path = Path(temp_dir) / "temp_video.mp4"
            
            # Download video from URL
            try:
                ydl_opts = {
                    "format": "best",
                    "outtmpl": str(temp_video_path),
                    "noplaylist": True,
                    "quiet": True,
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([video_url])
                    
                if not temp_video_path.exists():
                    return jsonify({"error": "Failed to download video"}), 400
                    
            except Exception as e:
                return jsonify({"error": f"Video download failed: {str(e)}"}), 400
            
            # Process video with Chapter-Llama
            try:
                single_video = SingleVideo(temp_video_path)
                prompt = PromptASR(chapters=single_video)
                
                vid_id = single_video.video_ids[0]
                prompt_text = prompt.get_prompt_test(vid_id)
                transcript = single_video.get_asr(vid_id)
                full_prompt = prompt_text + transcript
                
                # Generate chapters
                output_text, chapters = get_chapters(
                    inference_model,
                    full_prompt,
                    max_new_tokens=1024,
                    do_sample=do_sample,
                    vid_id=vid_id,
                    vid_duration=single_video.get_duration(vid_id)
                )
                
                if isinstance(output_text, int):
                    return jsonify({"error": f"Input too long: {output_text} tokens"}), 400
                
                if not chapters:
                    return jsonify({"error": "No chapters could be generated"}), 400
                
                # Format response
                formatted_chapters = []
                for timestamp, title in chapters.items():
                    formatted_chapters.append({
                        "timestamp": timestamp,
                        "title": title
                    })
                
                return jsonify({
                    "success": True,
                    "video_duration": single_video.get_duration(vid_id, hms=True),
                    "chapters": formatted_chapters,
                    "model_used": model_name,
                    "raw_output": output_text
                })
                
            except Exception as e:
                return jsonify({"error": f"Chapter generation failed: {str(e)}"}), 500
                
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/process-file', methods=['POST'])
def process_file():
    """Process uploaded video file and generate chapters"""
    try:
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
            
        video_file = request.files['video']
        model_name = request.form.get('model_name', 'asr-10k')
        do_sample = request.form.get('do_sample', 'false').lower() == 'true'
        
        if video_file.filename == '':
            return jsonify({"error": "No video file selected"}), 400
        
        # Load model if not cached
        global current_model
        if current_model is None or current_model != model_name:
            try:
                model_path = download_model(model_name)
                inference_model = LlamaInference(
                    ckpt_path="meta-llama/Llama-3.1-8B-Instruct",
                    peft_model=model_path
                )
                model_cache[model_name] = inference_model
                current_model = model_name
            except Exception as e:
                return jsonify({"error": f"Failed to load model: {str(e)}"}), 500
        
        inference_model = model_cache[model_name]
        
        # Create temporary directory for video processing
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_video_path = Path(temp_dir) / f"uploaded_{video_file.filename}"
            video_file.save(temp_video_path)
            
            # Process video with Chapter-Llama
            try:
                single_video = SingleVideo(temp_video_path)
                prompt = PromptASR(chapters=single_video)
                
                vid_id = single_video.video_ids[0]
                prompt_text = prompt.get_prompt_test(vid_id)
                transcript = single_video.get_asr(vid_id)
                full_prompt = prompt_text + transcript
                
                # Generate chapters
                output_text, chapters = get_chapters(
                    inference_model,
                    full_prompt,
                    max_new_tokens=1024,
                    do_sample=do_sample,
                    vid_id=vid_id,
                    vid_duration=single_video.get_duration(vid_id)
                )
                
                if isinstance(output_text, int):
                    return jsonify({"error": f"Input too long: {output_text} tokens"}), 400
                
                if not chapters:
                    return jsonify({"error": "No chapters could be generated"}), 400
                
                # Format response
                formatted_chapters = []
                for timestamp, title in chapters.items():
                    formatted_chapters.append({
                        "timestamp": timestamp,
                        "title": title
                    })
                
                return jsonify({
                    "success": True,
                    "video_duration": single_video.get_duration(vid_id, hms=True),
                    "chapters": formatted_chapters,
                    "model_used": model_name,
                    "filename": video_file.filename
                })
                
            except Exception as e:
                return jsonify({"error": f"Chapter generation failed: {str(e)}"}), 500
                
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5328)
