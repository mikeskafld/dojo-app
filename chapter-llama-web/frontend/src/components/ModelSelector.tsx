'use client'

import { useState, useEffect } from 'react'

interface Model {
  id: string
  name: string
  description: string
  recommended: boolean
  provider?: string
}

interface ModelSelectorProps {
  selectedModel: string
  onModelSelect: (modelId: string) => void
}

export default function ModelSelector({ selectedModel, onModelSelect }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5328'
        const response = await fetch(`${baseUrl}/api/models`)
        const data = await response.json()
        setModels(data.models)
      } catch (error) {
        console.error('Failed to fetch models:', error)
        // Fallback to Vercel AI Gateway model
        setModels([
          {
            id: "meta-llama-3.1-8b",
            name: "Meta Llama 3.1 8B",
            description: "Meta's Llama 3.1 8B model via Vercel AI Gateway",
            provider: "Vercel AI Gateway",
            recommended: true
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Model Selection</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Model Selection</h3>
      <div className="grid gap-3">
        {models.map((model) => (
          <div
            key={model.id}
            className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
              selectedModel === model.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onModelSelect(model.id)}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 pt-0.5">
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    selectedModel === model.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedModel === model.id && (
                    <div className="h-full w-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900">{model.name}</p>
                  {model.recommended && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Recommended
                    </span>
                  )}
                  {model.provider && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {model.provider}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{model.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
        <p className="font-medium mb-1">AI Model Information:</p>
        <ul className="text-xs space-y-1">
          <li>• Powered by Meta Llama 3.1 8B via Vercel AI Gateway</li>
          <li>• Cloud-based inference for optimal performance</li>
          <li>• Automatic video download and transcription</li>
          <li>• Intelligent semantic chapter generation</li>
        </ul>
      </div>
    </div>
  )
}
