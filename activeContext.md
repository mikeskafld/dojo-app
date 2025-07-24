# Chapter-Llama Active Context

## VAN Mode Assessment - COMPLETE

### System Architecture Overview
**Chapter-Llama** is a sophisticated video chaptering system built on:
- **Core Model**: Llama-3.1-8B-Instruct with LoRA fine-tuning
- **Input Processing**: ASR (speech) + Visual captions with timestamp alignment  
- **Output**: Semantic chapter boundaries with descriptive titles
- **Performance**: 45.3 F1 score (vs 26.7 SOTA) on VidChapters-7M

### Technical Components Mapped
1. **Inference Engine**:  class with PEFT model loading
2. **Data Pipeline**:  → ASR extraction → Prompt assembly  
3. **User Interfaces**: 
   - CLI:  (single video processing)
   - Web:  (Gradio interactive interface)
   - Research: / (model development)
4. **Configuration**: Hydra-based modular configs (data/model/experiment/paths)

### Data Flow Architecture


### User Interaction Patterns
- **Researchers**: Train/test models on VidChapters-7M dataset
- **Developers**: Process single videos via CLI interface  
- **End Users**: Upload videos through web interface for chapter generation

### Performance Characteristics
- **Scale**: Processes hour-long videos in single forward pass
- **Memory**: 35K max prompt tokens, CUDA OOM handling
- **Speed**: Efficient speech-guided frame selection strategy
- **Quality**: State-of-the-art results on academic benchmarks

