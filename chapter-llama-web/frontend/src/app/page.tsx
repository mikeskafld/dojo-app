'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import EnhancedVideoManager from '@/components/EnhancedVideoManager'
import ModelSelector from '@/components/ModelSelector'
import ChapterResults from '@/components/ChapterResults'
import Header from '@/components/Header'
import AuthButton from '@/components/AuthButton'
import SupabaseTest from '@/components/SupabaseTest'

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
  const { data: session, status } = useSession()
  const [selectedModel, setSelectedModel] = useState('meta-llama-3.1-8b')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVideoProcess = async (videoFile: File | null, videoUrl: string) => {
    if (status !== 'authenticated') {
      setError('Please sign in to process videos')
      return
    }

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
      {/* Header with Authentication */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dojo Platform</h1>
              <p className="text-sm text-gray-600">AI-Powered Video Chapter Platform with Complete Workflow</p>
            </div>
            <AuthButton />
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-gray-900">
              {session ? `Welcome back, ${session.user?.name || 'Creator'}!` : 'Welcome to Dojo'}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {session 
                ? 'Complete workflow: Upload → Store → Process → Generate AI Chapters'
                : 'Please sign in to start creating AI-powered video chapters'
              }
            </p>
            {session && (
              <div className="inline-flex items-center px-4 py-2 bg-green-100 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-green-800">
                  ✅ Authenticated • Storage: Ready • AI: Ready
                </span>
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 System Status</h3>
            <SupabaseTest />
          </div>

          {status === 'authenticated' ? (
            <>
              {/* Main Video Management Interface */}
              <EnhancedVideoManager />

              {/* Legacy Processing Interface - Optional */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer">
                    <h3 className="text-lg font-semibold text-gray-900">
                      🤖 Legacy AI Processing (Direct URL/Upload)
                    </h3>
                    <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-gray-600 mb-4">
                      Use this interface for direct URL processing or if you need the original workflow.
                    </p>
                    
                    {/* Model Selection */}
                    <div className="mb-6">
                      <ModelSelector 
                        selectedModel={selectedModel}
                        onModelSelect={setSelectedModel}
                      />
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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

                    {/* Results */}
                    {result && (
                      <ChapterResults result={result} />
                    )}
                  </div>
                </details>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🔐 Authentication Required
                </h3>
                <p className="text-gray-600 mb-6">
                  Sign in with your Google or GitHub account to start the complete video chaptering workflow.
                </p>
                <AuthButton />
                
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">🚀 Complete Workflow</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✅ Secure Video Upload & Storage</li>
                    <li>✅ AI Chapter Processing Integration</li>
                    <li>✅ Database-Synchronized Management</li>
                    <li>✅ Professional Chapter Export</li>
                    <li>✅ Real-time Progress Tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
