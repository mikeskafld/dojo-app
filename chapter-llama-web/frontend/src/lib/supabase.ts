import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database type definitions based on our schema
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          display_name: string | null
          email: string
          avatar_url: string | null
          bio: string | null
          account_type: 'viewer' | 'creator' | 'enterprise'
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          email: string
          avatar_url?: string | null
          bio?: string | null
          account_type?: 'viewer' | 'creator' | 'enterprise'
        }
        Update: {
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          account_type?: 'viewer' | 'creator' | 'enterprise'
        }
      }
      videos: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          thumbnail_url: string | null
          duration_seconds: number
          file_path: string
          processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'review_needed'
          ai_confidence_score: number | null
          category: string | null
          tags: string[] | null
          visibility: 'public' | 'unlisted' | 'private' | 'subscribers_only'
          is_premium: boolean
          view_count: number
          like_count: number
          comment_count: number
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          creator_id: string
          title: string
          description?: string | null
          duration_seconds: number
          file_path: string
          category?: string | null
          tags?: string[] | null
          visibility?: 'public' | 'unlisted' | 'private' | 'subscribers_only'
          is_premium?: boolean
        }
        Update: {
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          category?: string | null
          tags?: string[] | null
          visibility?: 'public' | 'unlisted' | 'private' | 'subscribers_only'
          is_premium?: boolean
        }
      }
      chapters: {
        Row: {
          id: string
          video_id: string
          timestamp_seconds: number
          duration_seconds: number
          title: string
          description: string | null
          thumbnail_url: string | null
          ai_generated: boolean
          ai_confidence_score: number | null
          human_edited: boolean
          needs_review: boolean
          view_count: number
          interaction_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          video_id: string
          timestamp_seconds: number
          duration_seconds: number
          title: string
          description?: string | null
          thumbnail_url?: string | null
          ai_confidence_score?: number | null
          needs_review?: boolean
        }
        Update: {
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          human_edited?: boolean
          needs_review?: boolean
        }
      }
    }
  }
}
