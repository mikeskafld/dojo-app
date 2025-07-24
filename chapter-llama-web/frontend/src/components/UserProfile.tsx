'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'

interface UserProfileData {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  account_type: 'viewer' | 'creator' | 'enterprise'
  is_verified: boolean
  created_at: string
  // Computed fields
  follower_count?: number
  following_count?: number
  video_count?: number
}

interface UserProfileProps {
  userId?: string // If not provided, shows current user's profile
  isEditable?: boolean
}

export default function UserProfile({ userId, isEditable = false }: UserProfileProps) {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    account_type: 'viewer' as 'viewer' | 'creator' | 'enterprise'
  })

  const targetUserId = userId || session?.user?.id
  const isOwnProfile = !userId || userId === session?.user?.id

  // Fetch user profile and stats
  const fetchProfile = async () => {
    if (!targetUserId) return

    try {
      setLoading(true)
      
      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (profileError) throw profileError

      // Get follower count
      const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId)

      // Get following count  
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId)

      // Get video count
      const { count: videoCount } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', targetUserId)

      // Check if current user follows this user
      if (session?.user?.id && !isOwnProfile) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', session.user.id)
          .eq('following_id', targetUserId)
          .single()
        
        setFollowing(!!followData)
      }

      setProfile({
        ...userProfile,
        follower_count: followerCount || 0,
        following_count: followingCount || 0,
        video_count: videoCount || 0
      })

      // Set form data for editing
      setEditForm({
        display_name: userProfile.display_name || '',
        bio: userProfile.bio || '',
        account_type: userProfile.account_type
      })

    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!session?.user?.id || !targetUserId || isOwnProfile) return

    setFollowLoading(true)
    try {
      if (following) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', targetUserId)
        
        setFollowing(false)
        setProfile(prev => prev ? { ...prev, follower_count: (prev.follower_count || 1) - 1 } : null)
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: session.user.id,
            following_id: targetUserId
          })
        
        setFollowing(true)
        setProfile(prev => prev ? { ...prev, follower_count: (prev.follower_count || 0) + 1 } : null)
      }
    } catch (error) {
      console.error('Error updating follow status:', error)
      setError('Failed to update follow status')
    } finally {
      setFollowLoading(false)
    }
  }

  // Handle profile update
  const handleSaveProfile = async () => {
    if (!session?.user?.id || !isOwnProfile) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: editForm.display_name || null,
          bio: editForm.bio || null,
          account_type: editForm.account_type
        })
        .eq('id', session.user.id)

      if (error) throw error

      await fetchProfile()
      setEditing(false)
      setError(null)
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile')
    }
  }

  const getAccountTypeBadge = (accountType: string) => {
    const badges = {
      viewer: { color: 'bg-gray-100 text-gray-800', text: 'Viewer' },
      creator: { color: 'bg-blue-100 text-blue-800', text: 'Creator' },
      enterprise: { color: 'bg-purple-100 text-purple-800', text: 'Enterprise' }
    }
    
    const badge = badges[accountType as keyof typeof badges] || badges.viewer
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  useEffect(() => {
    fetchProfile()
  }, [targetUserId, session])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-4">
          <div className="text-red-400 mb-2">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600">{error || 'User profile could not be loaded'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <img
            src={profile.avatar_url || '/default-avatar.png'}
            alt={profile.display_name || profile.username}
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
          />
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.display_name || profile.username}
              </h1>
              {profile.is_verified && (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-gray-600">@{profile.username}</p>
            <div className="flex items-center space-x-2 mt-1">
              {getAccountTypeBadge(profile.account_type)}
              <span className="text-xs text-gray-500">
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isOwnProfile && session?.user && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                following
                  ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500'
                  : 'border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {followLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {following ? 'Following' : 'Follow'}
            </button>
          )}
          
          {isOwnProfile && isEditable && (
            <button
              onClick={() => setEditing(!editing)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{profile.video_count}</div>
          <div className="text-sm text-gray-500">Videos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{profile.follower_count}</div>
          <div className="text-sm text-gray-500">Followers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{profile.following_count}</div>
          <div className="text-sm text-gray-500">Following</div>
        </div>
      </div>

      {/* Bio Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">About</h3>
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your display name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tell us about yourself..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <select
                value={editForm.account_type}
                onChange={(e) => setEditForm({ ...editForm, account_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="viewer">Viewer</option>
                <option value="creator">Creator</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveProfile}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {profile.bio ? (
              <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
            ) : (
              <p className="text-gray-500 italic">
                {isOwnProfile ? 'Add a bio to tell others about yourself.' : 'No bio available.'}
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
