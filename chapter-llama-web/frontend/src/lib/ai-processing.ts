import { supabase } from './supabase'

export interface AIProcessingOptions {
  videoId: string
  model: string
  userId: string
}

export interface ProcessingProgress {
  stage: 'downloading' | 'processing' | 'uploading_results' | 'complete' | 'error'
  progress: number
  message: string
  chapters?: Chapter[]
}

export interface Chapter {
  timestamp: string
  title: string
  timestamp_seconds: number
}

export class AIProcessor {
  // Process stored video with Chapter-Llama
  static async processStoredVideo(
    options: AIProcessingOptions,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Chapter[] | null> {
    try {
      onProgress?.({ 
        stage: 'downloading', 
        progress: 10, 
        message: 'Retrieving video from storage...' 
      })

      // Get video record from database
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', options.videoId)
        .eq('creator_id', options.userId)
        .single()

      if (videoError || !video) {
        throw new Error('Video not found or access denied')
      }

      // Update video status to processing
      await supabase
        .from('videos')
        .update({ processing_status: 'processing' })
        .eq('id', options.videoId)

      onProgress?.({ 
        stage: 'processing', 
        progress: 30, 
        message: 'Generating AI chapters with Chapter-Llama...' 
      })

      // Get signed URL for video file
      const { data: urlData, error: urlError } = await supabase.storage
        .from('videos')
        .createSignedUrl(video.file_path, 3600) // 1 hour expiry

      if (urlError || !urlData?.signedUrl) {
        throw new Error('Failed to generate video access URL')
      }

      onProgress?.({ 
        stage: 'processing', 
        progress: 50, 
        message: 'Processing video with AI model...' 
      })

      // Call Chapter-Llama backend with signed URL
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5328'
      const response = await fetch(`${baseUrl}/api/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: urlData.signedUrl,
          model_name: options.model,
          video_id: options.videoId // Pass for backend tracking
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'AI processing failed')
      }

      const result = await response.json()

      onProgress?.({ 
        stage: 'uploading_results', 
        progress: 80, 
        message: 'Saving chapters to database...' 
      })

      // Convert chapters to our format and save to database
      const chapters: Chapter[] = result.chapters.map((chapter: any, index: number) => ({
        timestamp: chapter.timestamp,
        title: chapter.title,
        timestamp_seconds: this.parseTimestamp(chapter.timestamp)
      }))

      // Save chapters to database
      const chaptersToInsert = chapters.map((chapter, index) => ({
        video_id: options.videoId,
        timestamp_seconds: chapter.timestamp_seconds,
        title: chapter.title,
        ai_generated: true,
        ai_confidence_score: 0.85, // Default confidence
        duration_seconds: index < chapters.length - 1 
          ? chapters[index + 1].timestamp_seconds - chapter.timestamp_seconds
          : 60 // Default for last chapter
      }))

      const { error: chaptersError } = await supabase
        .from('chapters')
        .insert(chaptersToInsert)

      if (chaptersError) {
        console.error('Error saving chapters:', chaptersError)
        // Don't fail the whole process if chapters save fails
      }

      // Update video status and metadata
      await supabase
        .from('videos')
        .update({ 
          processing_status: 'completed',
          duration_seconds: this.parseTimestamp(result.video_duration),
          ai_confidence_score: 0.85
        })
        .eq('id', options.videoId)

      onProgress?.({ 
        stage: 'complete', 
        progress: 100, 
        message: 'AI processing complete!',
        chapters 
      })

      return chapters

    } catch (error) {
      console.error('AI processing error:', error)
      
      // Update video status to failed
      await supabase
        .from('videos')
        .update({ 
          processing_status: 'failed',
          processing_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', options.videoId)

      onProgress?.({ 
        stage: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'Processing failed' 
      })

      return null
    }
  }

  // Parse timestamp string to seconds
  private static parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':')
    if (parts.length === 2) {
      // MM:SS format
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
    }
    return 0
  }

  // Get chapters for a video
  static async getVideoChapters(videoId: string): Promise<Chapter[]> {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('video_id', videoId)
        .order('timestamp_seconds', { ascending: true })

      if (error) throw error

      return data.map(chapter => ({
        timestamp: this.formatTimestamp(chapter.timestamp_seconds),
        title: chapter.title,
        timestamp_seconds: chapter.timestamp_seconds
      }))
    } catch (error) {
      console.error('Error fetching chapters:', error)
      return []
    }
  }

  // Format seconds to timestamp string
  private static formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }

  // Check if video has been processed
  static async hasChapters(videoId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId)

      if (error) throw error
      return (count || 0) > 0
    } catch (error) {
      console.error('Error checking chapters:', error)
      return false
    }
  }
}
