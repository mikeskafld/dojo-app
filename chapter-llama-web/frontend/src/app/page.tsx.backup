'use client'

import { useState } from 'react'
import VideoUploader from '@/components/VideoUploader'
import ModelSelector from '@/components/ModelSelector'
import ChapterResults from '@/components/ChapterResults'
import Header from '@/components/Header'

interface Chapter {
  timestamp: string
  title: string
}

interface ProcessingResult {
  success: boolean
  video_duration: string
  chapters: Chapter[]
  model_used: string
  filename?: string
  error?: string
  message?: string
  provider?: string
}

export default function Home() {
  const [selectedModel, setSelectedModel] = useState('meta-llama-3.1-8b')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVideoProcess = async (videoFile: File | null, videoUrl: string) => {
    setIsProcessing(true)
    setError(null)
    setResult(null)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5328'
      let response: Response

      if (videoFile) {
        // Process uploaded file
        const formData = new FormData()
        formData.append('video', videoFile)
        formData.append('model_name', selectedModel)

        response = await fetch(`${baseUrl}/api/process-file`, {
          method: 'POST',
          body: formData,
        })
      } else if (videoUrl) {
        // Process video URL
        response = await fetch(`${baseUrl}/api/process-video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_url: videoUrl,
            model_name: selectedModel,
          }),
        })
      } else {
        throw new Error('No video file or URL provided')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">
              Chapter-Llama Web
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              AI-powered video chapter generation using Meta Llama 3.1 8B via Vercel AI Gateway. 
              Upload a video or provide a YouTube URL to get started.
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-green-100 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-green-800">Vercel AI Gateway Connected</span>
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <ModelSelector 
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
            />
          </div>

          {/* Video Upload */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <VideoUploader 
              onProcess={handleVideoProcess}
              isProcessing={isProcessing}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Processing Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <ChapterResults result={result} />
          )}
        </div>
      </main>
    </div>
  )
}
