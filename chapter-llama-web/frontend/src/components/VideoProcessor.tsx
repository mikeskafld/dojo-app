'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { AIProcessor, ProcessingProgress, Chapter } from '@/lib/ai-processing'

interface VideoProcessorProps {
  video: {
    id: string
    title: string
    processing_status: string
    file_path: string
  }
  onProcessingComplete: (chapters: Chapter[]) => void
}

export default function VideoProcessor({ video, onProcessingComplete }: VideoProcessorProps) {
  const { data: session } = useSession()
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)
  const [selectedModel, setSelectedModel] = useState('meta-llama-3.1-8b')
  const [error, setError] = useState<string | null>(null)

  const availableModels = [
    { id: 'meta-llama-3.1-8b', name: 'Llama 3.1 8B (Recommended)', description: 'Best balance of speed and accuracy' },
    { id: 'captions_asr-10k', name: 'Captions + ASR 10k', description: 'High accuracy with visual captions' },
    { id: 'asr-10k', name: 'ASR 10k', description: 'Speech-based processing' }
  ]

  const handleProcess = async () => {
    if (!session?.user?.id) {
      setError('Authentication required')
      return
    }

    if (video.processing_status === 'processing') {
      setError('Video is already being processed')
      return
    }

    setProcessing(true)
    setError(null)
    setProgress(null)

    try {
      const chapters = await AIProcessor.processStoredVideo(
        {
          videoId: video.id,
          model: selectedModel,
          userId: session.user.id
        },
        setProgress
      )

      if (chapters) {
        onProcessingComplete(chapters)
      } else {
        throw new Error('Processing failed - no chapters generated')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Processing failed')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  const canProcess = video.processing_status === 'pending' || video.processing_status === 'failed'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{video.title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            File: {video.file_path.split('/').pop()}
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(video.processing_status)}`}>
          {video.processing_status}
        </span>
      </div>

      {canProcess && !processing && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {availableModels.find(m => m.id === selectedModel)?.description}
            </p>
          </div>

          <button
            onClick={handleProcess}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate AI Chapters
          </button>
        </div>
      )}

      {processing && progress && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {progress.stage === 'downloading' && 'Preparing Video'}
                {progress.stage === 'processing' && 'AI Processing'}
                {progress.stage === 'uploading_results' && 'Saving Results'}
                {progress.stage === 'complete' && 'Complete!'}
              </p>
              <p className="text-xs text-gray-500">{progress.message}</p>
            </div>
            <div className="text-sm text-gray-500">
              {progress.progress}%
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>

          {progress.chapters && progress.chapters.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Generated {progress.chapters.length} Chapters
              </h4>
              <div className="space-y-1">
                {progress.chapters.slice(0, 3).map((chapter, index) => (
                  <div key={index} className="text-xs text-green-700">
                    {chapter.timestamp} - {chapter.title}
                  </div>
                ))}
                {progress.chapters.length > 3 && (
                  <div className="text-xs text-green-600">
                    ...and {progress.chapters.length - 3} more chapters
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Processing Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {video.processing_status === 'completed' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Processing Complete</h3>
              <p className="text-sm text-green-700 mt-1">
                AI chapters have been generated and saved for this video.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
