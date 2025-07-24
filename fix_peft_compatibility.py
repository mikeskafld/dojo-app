import json
import shutil
from pathlib import Path
from tools.download.models import download_model, MODEL_PATHS

def fix_adapter_config(model_path):
    """Remove unsupported parameters from adapter config"""
    config_path = Path(model_path) / "adapter_config.json"
    backup_path = Path(model_path) / "adapter_config.json.backup"
    
    # Create backup if not exists
    if not backup_path.exists():
        shutil.copy2(config_path, backup_path)
    
    # Load and modify config
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Remove unsupported parameters for older PEFT versions
    unsupported_params = [
        'layer_replication', 
        'use_dora',
        'use_rslora',  
        'loftq_config',
        'megatron_config',
        'megatron_core'
    ]
    removed = []
    
    for param in unsupported_params:
        if param in config:
            removed.append(f"{param}: {config.pop(param)}")
    
    # Save modified config
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ Fixed adapter config at: {config_path}")
    if removed:
        print(f"🗑️  Removed unsupported parameters: {', '.join(removed)}")
    
    return config_path

if __name__ == "__main__":
    print("🔧 Fixing PEFT compatibility for all models...")
    
    for model_name in MODEL_PATHS.keys():
        print(f"\n📦 Fixing {model_name}...")
        try:
            model_path = download_model(model_name)
            fix_adapter_config(model_path)
        except Exception as e:
            print(f"❌ Error fixing {model_name}: {e}")
    
    print("\n✅ All models fixed for PEFT compatibility!")
