'use client'

import { useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { SupabaseStorage, UploadProgress } from '@/lib/storage'

interface EnhancedVideoUploaderProps {
  onVideoUploaded: (videoData: { path: string; url: string; file: File }) => void
  onError: (error: string) => void
}

export default function EnhancedVideoUploader({ 
  onVideoUploaded, 
  onError 
}: EnhancedVideoUploaderProps) {
  const { data: session } = useSession()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = [
      'video/mp4', 'video/avi', 'video/mov', 
      'video/wmv', 'video/flv', 'video/webm', 'video/mkv'
    ]
    if (!validTypes.includes(file.type)) {
      return 'Please upload a valid video file (MP4, AVI, MOV, WMV, FLV, WebM, MKV)'
    }

    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (file.size > maxSize) {
      return 'File size must be less than 500MB'
    }

    return null
  }

  const uploadFile = async (file: File) => {
    if (!session?.user?.id) {
      onError('Please sign in to upload videos')
      return
    }

    const validationError = validateFile(file)
    if (validationError) {
      onError(validationError)
      return
    }

    setUploading(true)
    setUploadProgress({ progress: 0, stage: 'uploading', message: 'Preparing upload...' })

    try {
      const result = await SupabaseStorage.uploadVideo(
        file,
        session.user.id,
        setUploadProgress
      )

      if (result) {
        onVideoUploaded({ ...result, file })
        setUploadProgress({ progress: 100, stage: 'complete', message: 'Upload successful!' })
        
        // Reset after a short delay
        setTimeout(() => {
          setUploadProgress(null)
          setUploading(false)
        }, 2000)
      } else {
        throw new Error('Upload failed - no result returned')
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed')
      setUploadProgress(null)
      setUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (!session?.user) {
      onError('Please sign in to upload videos')
      return
    }

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }, [session, onError])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
    // Reset input value to allow same file upload
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  if (!session) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-500">Please sign in to upload videos</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${uploading ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!uploading ? openFileDialog : undefined}
      >
        {uploading && uploadProgress ? (
          <div className="space-y-4">
            <div className="text-blue-600">
              <svg className="mx-auto h-12 w-12 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {uploadProgress.stage === 'uploading' && 'Uploading Video'}
                {uploadProgress.stage === 'processing' && 'Processing Upload'}
                {uploadProgress.stage === 'complete' && 'Upload Complete!'}
              </h3>
              <p className="text-gray-600 mb-4">{uploadProgress.message}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500">{uploadProgress.progress}% complete</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Video to Supabase Storage</h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your video file here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports MP4, AVI, MOV, WMV, FLV, WebM, MKV up to 500MB
            </p>
          </div>
        )}
      </div>

      {uploadProgress?.stage === 'complete' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Upload Successful!</h3>
              <p className="text-sm text-green-700 mt-1">
                Your video has been securely uploaded to Supabase Storage and is ready for processing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
