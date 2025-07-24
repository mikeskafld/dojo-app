from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "Chapter-Llama API"})

@app.route('/api/models', methods=['GET'])
def get_available_models():
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
        }
    ]
    return jsonify({"models": models})

if __name__ == '__main__':
    print("🚀 Starting Chapter-Llama Flask API...")
    print("📡 Server running on http://localhost:5328")
    app.run(debug=True, port=5328, host='0.0.0.0')
