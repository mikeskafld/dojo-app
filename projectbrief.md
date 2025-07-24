# Chapter-Llama Project Brief

## Project Overview
Academic research project for efficient video chaptering in hour-long videos using Large Language Models.

**Publication**: CVPR 2025  
**Authors**: Lucas Ventura, Antoine Yang, Cordelia Schmid, Gül Varol  
**Repository**: https://github.com/lucas-ventura/chapter-llama

## Core Functionality
- **Input**: Hour-long videos  
- **Processing**: Speech transcripts (ASR) + video frame captions  
- **Model**: Llama-3.1-8B-Instruct with LoRA fine-tuning  
- **Output**: Semantic chapter boundaries with timestamps and titles  

## Key Components
- **Demo Interface**:  (Gradio web interface)
- **Single Video Processing**:  
- **Research Pipeline**: /
- **Dataset**: VidChapters-7M benchmark
- **Models**: asr-10k, captions_asr-10k, captions_asr-1k variants

## Technical Architecture
- **Framework**: PyTorch Lightning + Hydra configuration
- **Data Pipeline**: ASR extraction, frame captioning, speech-guided frame selection
- **Training**: LoRA parameter-efficient fine-tuning
- **Inference**: Single forward pass for hour-long videos

## Performance
Achieves 45.3 vs 26.7 F1 score improvement over state-of-the-art on VidChapters-7M benchmark.

