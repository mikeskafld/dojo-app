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

# Global model cache
model_cache = {}

def init_simple_model(model_name="asr-10k"):
    """Initialize model with the standard Chapter-Llama approach"""
    if model_name not in model_cache:
        print(f"🔄 Loading Chapter-Llama model: {model_name}")
        try:
            # Download the model weights (we already fixed PEFT compatibility)
            model_path = download_model(model_name)
            print(f"📦 Model downloaded to: {model_path}")
            
            # Initialize inference model (standard way)
            inference = LlamaInference(
                ckpt_path="meta-llama/Llama-3.1-8B-Instruct", 
                peft_model=model_path
            )
            
            model_cache[model_name] = inference
            print(f"✅ Model {model_name} loaded successfully!")
            return inference
            
        except Exception as e:
            print(f"❌ Error loading model {model_name}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    return model_cache[model_name]

def test_simple_inference():
    """Test if we can load and run a simple inference"""
    try:
        print("🧪 Testing simple model loading...")
        inference = init_simple_model("asr-10k")
        if inference:
            print("✅ Model loaded successfully!")
            return True
        else:
            print("❌ Model failed to load")
            return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "service": "Simple Chapter-Llama Local API",
        "models_cached": list(model_cache.keys())
    })

@app.route('/api/test-model', methods=['GET'])
def test_model():
    """Test endpoint to check if model loading works"""
    success = test_simple_inference()
    return jsonify({
        "test_passed": success,
        "message": "Model loading test completed",
        "models_cached": list(model_cache.keys())
    })

@app.route('/api/models', methods=['GET'])
def get_available_models():
    models = [
        {
            "id": "asr-10k",
            "name": "ASR-10k",
            "description": "ASR-trained model (10k samples) - balanced performance", 
            "recommended": True
        }
    ]
    return jsonify({"models": models})

@app.route('/api/process-video', methods=['POST'])
def process_video():
    """Simple video processing test"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        video_url = data.get('video_url')
        model_name = data.get('model_name', 'asr-10k')
        
        # For now, just test if we can load the model
        inference = init_simple_model(model_name)
        if inference is None:
            return jsonify({
                "success": False,
                "error": "Failed to load model",
                "message": "Model loading failed - check logs for details"
            }), 500
        
        # Return success message for now
        return jsonify({
            "success": True,
            "message": "Model loaded successfully! Full video processing will be enabled once model loading is stable.",
            "model_used": model_name,
            "status": "Model Ready"
        })
        
    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

if __name__ == '__main__':
    print("🚀 Starting Simple Local Chapter-Llama Test API...")
    print("📡 Server running on http://localhost:5328")
    print("🧪 This version focuses on getting model loading working first")
    
    app.run(debug=True, port=5328, host='0.0.0.0')
