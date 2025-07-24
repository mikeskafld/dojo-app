import os
import sys

# Set environment variables
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:128'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

print("🧪 Debug: Testing Chapter-Llama model loading step by step...")

try:
    print("1. Testing basic imports...")
    from tools.download.models import download_model
    print("✅ download_model import successful")
    
    from src.models.llama_inference import LlamaInference
    print("✅ LlamaInference import successful")
    
    print("\n2. Testing model download...")
    model_path = download_model("asr-10k")
    print(f"✅ Model downloaded to: {model_path}")
    
    print("\n3. Testing model initialization...")
    print("⚠️  This might take a while and use significant memory...")
    
    # Try the most basic initialization
    inference = LlamaInference(
        ckpt_path="meta-llama/Llama-3.1-8B-Instruct", 
        peft_model=model_path
    )
    
    print("✅ SUCCESS! Model loaded successfully!")
    
except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
