# Chapter-Llama Web Application

A modern Next.js + Flask web application for the Chapter-Llama video chaptering system. This application provides an intuitive interface for generating semantic chapters in long-form videos using state-of-the-art LLM technology.

## Features

- 🎥 **Video Processing**: Upload video files or provide YouTube/Vimeo URLs
- 🤖 **Multiple Models**: Choose from different Chapter-Llama model variants
- 📝 **Chapter Generation**: Generate semantic chapters with timestamps and titles
- 💾 **Export Options**: Export results as JSON or plain text
- 🎨 **Modern UI**: Clean, responsive interface built with Tailwind CSS
- ⚡ **Real-time Processing**: Live progress updates during video analysis

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Next.js       │────▶│   Flask API     │
│   Frontend      │     │   Backend       │
│   (Port 3000)   │     │   (Port 5328)   │
└─────────────────┘     └─────────────────┘
                               │
                        ┌─────────────────┐
                        │ Chapter-Llama   │
                        │ Core System     │
                        └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- CUDA-compatible GPU (recommended)
- Chapter-Llama dependencies (see main repository)

### Installation

1. **Clone and setup the main Chapter-Llama repository**:
   ```bash
   git clone https://github.com/lucas-ventura/chapter-llama.git
   cd chapter-llama
   pip install -r requirements.txt
   ```

2. **Start the Flask backend**:
   ```bash
   cd chapter-llama-web/backend
   pip install -r requirements.txt
   python app.py
   ```

3. **Start the Next.js frontend**:
   ```bash
   cd chapter-llama-web/frontend
   npm install
   npm run dev
   ```

4. **Access the application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser

## API Endpoints

### Flask Backend (Port 5328)

- `GET /api/health` - Health check
- `GET /api/models` - List available models
- `POST /api/process-video` - Process video from URL
- `POST /api/process-file` - Process uploaded video file

### Example API Usage

```javascript
// Process video from URL
const response = await fetch('/api/process-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    video_url: 'https://www.youtube.com/watch?v=...',
    model_name: 'captions_asr-10k'
  })
})

const result = await response.json()
```

## Model Variants

- **asr-10k**: ASR-trained model for speech-based frame selection
- **captions_asr-10k**: Combined captions and ASR model (recommended)
- **captions_asr-1k**: Smaller training set variant for testing

## Development

### Frontend Development

```bash
cd chapter-llama-web/frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Backend Development

```bash
cd chapter-llama-web/backend
python app.py        # Start Flask development server
```

## Deployment

### Vercel Deployment

This application is structured to work with Vercel's hybrid deployment model:

1. **Frontend**: Next.js app deployed to Vercel
2. **Backend**: Flask API deployed as Vercel serverless functions

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## Configuration

### Environment Variables

Create `.env.local` in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5328
```

### Backend Configuration

Modify `backend/app.py` for custom settings:
- Model paths
- Processing parameters
- CORS settings

## Performance Optimization

- **Model Caching**: Models are cached in memory for faster subsequent requests
- **Async Processing**: Non-blocking video processing with progress updates
- **Error Handling**: Comprehensive error handling and user feedback
- **Memory Management**: CUDA memory management for GPU processing

## Troubleshooting

### Common Issues

1. **CUDA Out of Memory**: Reduce video length or use CPU-only processing
2. **Model Download Fails**: Check internet connection and Hugging Face access
3. **Video Processing Timeout**: Increase timeout limits for very long videos

### Debug Mode

Enable debug logging in Flask:

```python
app.run(debug=True, port=5328)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the same terms as the main Chapter-Llama repository.

## Citation

If you use this web application in your research, please cite:

```bibtex
@InProceedings{ventura25chapter,
    title     = {{Chapter-Llama}: Efficient Chaptering in Hour-Long Videos with {LLM}s},
    author    = {Lucas Ventura and Antoine Yang and Cordelia Schmid and G{"u}l Varol},
    booktitle = {CVPR},
    year      = {2025}
}
```
