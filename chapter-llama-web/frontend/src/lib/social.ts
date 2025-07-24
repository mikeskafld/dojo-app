import { supabase } from './supabase'

export interface SocialStats {
  follower_count: number
  following_count: number
  video_count: number
  like_count: number
}

export class SocialService {
  // Get user's social stats
  static async getUserStats(userId: string): Promise<SocialStats> {
    try {
      const [followerCount, followingCount, videoCount, likeCount] = await Promise.all([
        // Followers
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId),
        
        // Following
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId),
        
        // Videos
        supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', userId),
        
        // Likes received on user's content
        supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
      ])

      return {
        follower_count: followerCount.count || 0,
        following_count: followingCount.count || 0,
        video_count: videoCount.count || 0,
        like_count: likeCount.count || 0
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      return {
        follower_count: 0,
        following_count: 0,
        video_count: 0,
        like_count: 0
      }
    }
  }

  // Follow a user
  static async followUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: followerId,
          following_id: followingId
        })

      return !error
    } catch (error) {
      console.error('Error following user:', error)
      return false
    }
  }

  // Unfollow a user
  static async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId)

      return !error
    } catch (error) {
      console.error('Error unfollowing user:', error)
      return false
    }
  }

  // Check if user follows another user
  static async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single()

      return !error && !!data
    } catch (error) {
      return false
    }
  }

  // Like a video
  static async likeVideo(userId: string, videoId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: userId,
          video_id: videoId
        })

      return !error
    } catch (error) {
      console.error('Error liking video:', error)
      return false
    }
  }

  // Unlike a video
  static async unlikeVideo(userId: string, videoId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('video_id', videoId)

      return !error
    } catch (error) {
      console.error('Error unliking video:', error)
      return false
    }
  }

  // Check if user liked a video
  static async hasLikedVideo(userId: string, videoId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single()

      return !error && !!data
    } catch (error) {
      return false
    }
  }

  // Search users
  static async searchUsers(query: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, is_verified, account_type')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .eq('is_active', true)
        .order('is_verified', { ascending: false })
        .limit(limit)

      return data || []
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  }
}
