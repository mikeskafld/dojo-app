'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import EnhancedVideoUploader from './EnhancedVideoUploader'

interface VideoData {
  id: string
  title: string
  file_path: string
  file_size_bytes: number
  duration_seconds: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

export default function VideoManager() {
  const { data: session } = useSession()
  const [videos, setVideos] = useState<VideoData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's videos
  const fetchVideos = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('creator_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setVideos(data || [])
    } catch (error) {
      console.error('Error fetching videos:', error)
      setError('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  // Handle new video upload
  const handleVideoUploaded = async (uploadData: { path: string; url: string; file: File }) => {
    if (!session?.user?.id) return

    try {
      // Create video record in database
      const { data, error } = await supabase
        .from('videos')
        .insert({
          creator_id: session.user.id,
          title: uploadData.file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
          file_path: uploadData.path,
          file_size_bytes: uploadData.file.size,
          original_filename: uploadData.file.name,
          processing_status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      setVideos(prev => [data, ...prev])
      setError(null)
    } catch (error) {
      console.error('Error saving video record:', error)
      setError('Failed to save video information')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'Unknown'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', text: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' }
    }
    
    const badge = badges[status as keyof typeof badges] || badges.pending
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  useEffect(() => {
    fetchVideos()
  }, [session])

  if (!session) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
        <p className="text-gray-600">Please sign in to manage your videos</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload New Video</h2>
        <EnhancedVideoUploader 
          onVideoUploaded={handleVideoUploaded}
          onError={setError}
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
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Videos List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Videos</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Videos Yet</h3>
            <p className="text-gray-600">Upload your first video to get started with AI-powered chaptering!</p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Video</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{video.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{video.file_path}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFileSize(video.file_size_bytes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(video.duration_seconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(video.processing_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(video.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
