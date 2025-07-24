from flask import Flask, request, jsonify
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

@app.route('/api/process-video', methods=['POST'])
def process_video():
    """Process video URL - Demo version without Chapter-Llama dependencies"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        video_url = data.get('video_url')
        model_name = data.get('model_name', 'asr-10k')
        
        if not video_url:
            return jsonify({"error": "No video URL provided"}), 400
        
        # Demo response - no actual processing
        demo_chapters = [
            {"timestamp": "00:00:00", "title": "Introduction"},
            {"timestamp": "00:02:30", "title": "Main Content"}, 
            {"timestamp": "00:05:15", "title": "Key Discussion"},
            {"timestamp": "00:08:00", "title": "Conclusion"}
        ]
        
        return jsonify({
            "success": True,
            "video_duration": "00:10:00",
            "chapters": demo_chapters,
            "model_used": model_name,
            "message": "Demo mode - Install Chapter-Llama dependencies for full functionality"
        })
        
    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/api/process-file', methods=['POST']) 
def process_file():
    """Process uploaded file - Demo version"""
    try:
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
            
        video_file = request.files['video']
        model_name = request.form.get('model_name', 'asr-10k')
        
        if video_file.filename == '':
            return jsonify({"error": "No video file selected"}), 400
        
        # Demo response
        demo_chapters = [
            {"timestamp": "00:00:00", "title": f"Opening - {video_file.filename}"},
            {"timestamp": "00:01:45", "title": "Content Analysis"},
            {"timestamp": "00:04:20", "title": "Key Points"},
            {"timestamp": "00:06:30", "title": "Summary"}
        ]
        
        return jsonify({
            "success": True,
            "video_duration": "00:08:00", 
            "chapters": demo_chapters,
            "model_used": model_name,
            "filename": video_file.filename,
            "message": "Demo mode - Install Chapter-Llama dependencies for full functionality"
        })
        
    except Exception as e:
        return jsonify({"error": f"File processing failed: {str(e)}"}), 500

if __name__ == '__main__':
    print("🚀 Starting Working Chapter-Llama Flask API...")
    print("�� Server running on http://localhost:5328")
    print("🔧 Demo mode - All endpoints return sample data")
    print("💡 To enable full functionality, set up Chapter-Llama conda environment")
    app.run(debug=True, port=5328, host='0.0.0.0')
