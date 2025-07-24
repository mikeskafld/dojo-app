'use client'

import { useState } from 'react'

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
  raw_output?: string
}

interface ChapterResultsProps {
  result: ProcessingResult
}

export default function ChapterResults({ result }: ChapterResultsProps) {
  const [showRawOutput, setShowRawOutput] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const exportAsJSON = () => {
    const dataStr = JSON.stringify(result, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chapters-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportAsText = () => {
    const textContent = result.chapters
      .map(chapter => `${chapter.timestamp}: ${chapter.title}`)
      .join('\n')
    
    const dataBlob = new Blob([textContent], { type: 'text/plain' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chapters-${Date.now()}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-green-50 border-b border-green-200">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-green-900">
              Chapters Generated Successfully!
            </h3>
            <p className="text-sm text-green-700">
              {result.chapters.length} chapters found • 
              Duration: {result.video_duration} • 
              Model: {result.model_used}
              {result.filename && ` • File: ${result.filename}`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={exportAsJSON}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export JSON
          </button>
          <button
            onClick={exportAsText}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Text
          </button>
          <button
            onClick={() => setShowRawOutput(!showRawOutput)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            {showRawOutput ? 'Hide' : 'Show'} Raw Output
          </button>
        </div>

        {/* Chapters List */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">Generated Chapters</h4>
          <div className="space-y-3">
            {result.chapters.map((chapter, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      {chapter.timestamp}
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${chapter.timestamp}: ${chapter.title}`)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-1 text-gray-900">{chapter.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Raw Output */}
        {showRawOutput && result.raw_output && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Raw LLM Output</h4>
              <button
                onClick={() => copyToClipboard(result.raw_output || '')}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Copy to clipboard
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
              {result.raw_output}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
