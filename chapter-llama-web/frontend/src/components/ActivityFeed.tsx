'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'

interface ActivityUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  is_verified: boolean
}

interface ActivityVideo {
  id: string
  title: string
  thumbnail_url: string | null
}

interface ActivityItem {
  id: string
  type: 'follow' | 'upload' | 'like'
  user: ActivityUser
  target_user?: {
    id: string
    username: string
    display_name: string | null
  }
  video?: ActivityVideo
  created_at: string
}

export default function ActivityFeed() {
  const { data: session } = useSession()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivityFeed = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      
      // Get users that the current user follows
      const { data: followedUsers } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id)

      const followedUserIds = followedUsers?.map(f => f.following_id) || []
      
      if (followedUserIds.length === 0) {
        setActivities([])
        return
      }

      const activities: ActivityItem[] = []

      // Get recent video uploads from followed users
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          creator_id,
          created_at
        `)
        .in('creator_id', followedUserIds)
        .eq('visibility', 'public')
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10)

      if (videosError) {
        console.error('Videos query error:', videosError)
      } else if (videos) {
        // Get creator information separately
        const creatorIds = Array.from(new Set(videos.map(v => v.creator_id)))
        const { data: creators } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, is_verified')
          .in('id', creatorIds)

        const creatorMap = new Map(creators?.map(c => [c.id, c]) || [])

        videos.forEach(video => {
          const creator = creatorMap.get(video.creator_id)
          if (creator) {
            activities.push({
              id: `upload_${video.id}`,
              type: 'upload',
              user: {
                id: creator.id,
                username: creator.username,
                display_name: creator.display_name,
                avatar_url: creator.avatar_url,
                is_verified: creator.is_verified
              },
              video: {
                id: video.id,
                title: video.title,
                thumbnail_url: video.thumbnail_url
              },
              created_at: video.created_at
            })
          }
        })
      }

      // Get recent follows from followed users
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select(`
          id,
          follower_id,
          following_id,
          created_at
        `)
        .in('follower_id', followedUserIds)
        .order('created_at', { ascending: false })
        .limit(10)

      if (followsError) {
        console.error('Follows query error:', followsError)
      } else if (follows) {
        // Get user information separately
        const allUserIds = Array.from(new Set([
          ...follows.map(f => f.follower_id),
          ...follows.map(f => f.following_id)
        ]))
        
        const { data: users } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, is_verified')
          .in('id', allUserIds)

        const userMap = new Map(users?.map(u => [u.id, u]) || [])

        follows.forEach(follow => {
          const follower = userMap.get(follow.follower_id)
          const following = userMap.get(follow.following_id)
          
          if (follower && following) {
            activities.push({
              id: `follow_${follow.id}`,
              type: 'follow',
              user: {
                id: follower.id,
                username: follower.username,
                display_name: follower.display_name,
                avatar_url: follower.avatar_url,
                is_verified: follower.is_verified
              },
              target_user: {
                id: following.id,
                username: following.username,
                display_name: following.display_name
              },
              created_at: follow.created_at
            })
          }
        })
      }

      // Get recent likes from followed users
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select(`
          id,
          user_id,
          video_id,
          created_at
        `)
        .in('user_id', followedUserIds)
        .not('video_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)

      if (likesError) {
        console.error('Likes query error:', likesError)
      } else if (likes) {
        // Get user and video information separately
        const likeUserIds = Array.from(new Set(likes.map(l => l.user_id)))
        const likeVideoIds = Array.from(new Set(likes.map(l => l.video_id).filter(Boolean)))

        const [{ data: likeUsers }, { data: likeVideos }] = await Promise.all([
          supabase
            .from('users')
            .select('id, username, display_name, avatar_url, is_verified')
            .in('id', likeUserIds),
          supabase
            .from('videos')
            .select('id, title, thumbnail_url')
            .in('id', likeVideoIds)
        ])

        const likeUserMap = new Map(likeUsers?.map(u => [u.id, u]) || [])
        const likeVideoMap = new Map(likeVideos?.map(v => [v.id, v]) || [])

        likes.forEach(like => {
          const user = likeUserMap.get(like.user_id)
          const video = likeVideoMap.get(like.video_id)
          
          if (user && video) {
            activities.push({
              id: `like_${like.id}`,
              type: 'like',
              user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                avatar_url: user.avatar_url,
                is_verified: user.is_verified
              },
              video: {
                id: video.id,
                title: video.title,
                thumbnail_url: video.thumbnail_url
              },
              created_at: like.created_at
            })
          }
        })
      }

      // Sort all activities by date
      const sortedActivities = activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20)

      setActivities(sortedActivities)
    } catch (error) {
      console.error('Error fetching activity feed:', error)
      setError('Failed to load activity feed')
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return (
          <div className="bg-blue-100 rounded-full p-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )
      case 'follow':
        return (
          <div className="bg-green-100 rounded-full p-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
        )
      case 'like':
        return (
          <div className="bg-red-100 rounded-full p-2">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="bg-gray-100 rounded-full p-2">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  const renderActivityContent = (activity: ActivityItem) => {
    const userName = activity.user.display_name || activity.user.username

    switch (activity.type) {
      case 'upload':
        return (
          <div className="flex items-start space-x-3">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{userName}</span>
              {activity.user.is_verified && (
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-gray-600">uploaded a new video</span>
          </div>
        )
      case 'follow':
        return (
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">{userName}</span>
            {activity.user.is_verified && (
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-gray-600">started following</span>
            <span className="font-medium text-gray-900">
              {activity.target_user?.display_name || activity.target_user?.username}
            </span>
          </div>
        )
      case 'like':
        return (
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">{userName}</span>
            {activity.user.is_verified && (
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-gray-600">liked a video</span>
          </div>
        )
      default:
        return <span className="text-gray-600">performed an action</span>
    }
  }

  useEffect(() => {
    fetchActivityFeed()
  }, [session])

  if (!session) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Feed</h3>
        <div className="text-center py-8">
          <p className="text-gray-600">Sign in to see activity from people you follow</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Feed</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Feed</h3>
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Feed</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchActivityFeed}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Feed</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
          <p className="text-gray-600">Follow some creators to see their activity here!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
        <button
          onClick={fetchActivityFeed}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <img
              src={activity.user.avatar_url || '/default-avatar.png'}
              alt={activity.user.username}
              className="w-8 h-8 rounded-full object-cover"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 mb-1">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="mb-2">
                {renderActivityContent(activity)}
              </div>

              {activity.video && (
                <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded border">
                  <div className="w-12 h-8 bg-gray-200 rounded overflow-hidden">
                    {activity.video.thumbnail_url ? (
                      <img
                        src={activity.video.thumbnail_url}
                        alt={activity.video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900 line-clamp-2">
                    {activity.video.title}
                  </span>
                </div>
              )}

              <div className="text-xs text-gray-500 mt-2">
                {formatTimeAgo(activity.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
