import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export interface UploadProgress {
  progress: number
  stage: 'uploading' | 'processing' | 'complete' | 'error'
  message?: string
}

export class SupabaseStorage {
  // Upload video file to user's folder
  static async uploadVideo(
    file: File, 
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ path: string; url: string } | null> {
    try {
      onProgress?.({ progress: 0, stage: 'uploading', message: 'Starting upload...' })

      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${uuidv4()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      onProgress?.({ progress: 10, stage: 'uploading', message: 'Uploading file...' })

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        onProgress?.({ progress: 0, stage: 'error', message: error.message })
        throw error
      }

      onProgress?.({ progress: 80, stage: 'processing', message: 'Generating access URL...' })

      // Get public URL for uploaded file
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath)

      onProgress?.({ progress: 100, stage: 'complete', message: 'Upload complete!' })

      return {
        path: data.path,
        url: urlData.publicUrl
      }
    } catch (error) {
      onProgress?.({ progress: 0, stage: 'error', message: 'Upload failed' })
      console.error('Video upload error:', error)
      return null
    }
  }

  // Upload thumbnail for video
  static async uploadThumbnail(
    file: File,
    userId: string, 
    videoId: string
  ): Promise<{ path: string; url: string } | null> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${videoId}_thumbnail.${fileExt}`
      const filePath = `${userId}/${fileName}`

      const { data, error } = await supabase.storage
        .from('thumbnails')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(filePath)

      return {
        path: data.path,
        url: urlData.publicUrl
      }
    } catch (error) {
      console.error('Thumbnail upload error:', error)
      return null
    }
  }

  // Upload user avatar
  static async uploadAvatar(
    file: File,
    userId: string
  ): Promise<{ path: string; url: string } | null> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar.${fileExt}`
      const filePath = `${userId}/${fileName}`

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return {
        path: data.path,
        url: urlData.publicUrl
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      return null
    }
  }

  // Delete video file
  static async deleteVideo(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('videos')
        .remove([filePath])

      if (error) throw error
      return true
    } catch (error) {
      console.error('Video deletion error:', error)
      return false
    }
  }

  // Get file size and metadata
  static async getFileInfo(bucket: string, filePath: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(filePath.split('/').slice(0, -1).join('/'))

      if (error) throw error

      const fileName = filePath.split('/').pop()
      const fileInfo = data.find(file => file.name === fileName)
      
      return fileInfo
    } catch (error) {
      console.error('File info error:', error)
      return null
    }
  }
}
