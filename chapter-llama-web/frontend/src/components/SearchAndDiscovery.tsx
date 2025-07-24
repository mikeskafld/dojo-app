'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { SocialService } from '@/lib/social'

interface SearchResults {
  users: any[]
  videos: any[]
  loading: boolean
}

export default function SearchAndDiscovery() {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResults>({
    users: [],
    videos: [],
    loading: false
  })
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'search'>('trending')
  const [trendingVideos, setTrendingVideos] = useState<any[]>([])
  const [recentVideos, setRecentVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Search function with debouncing
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ users: [], videos: [], loading: false })
      return
    }

    setSearchResults(prev => ({ ...prev, loading: true }))

    try {
      // Search users
      const users = await SocialService.searchUsers(query, 10)

      // Search videos
      const { data: videos } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          view_count,
          like_count,
          created_at,
          duration_seconds,
          creator_id
        `)
        .eq('visibility', 'public')
        .eq('processing_status', 'completed')
        .textSearch('title', query)
        .order('view_count', { ascending: false })
        .limit(10)

      setSearchResults({
        users,
        videos: videos || [],
        loading: false
      })
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults({ users: [], videos: [], loading: false })
    }
  }, [session])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && activeTab === 'search') {
        performSearch(searchQuery)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, performSearch, activeTab])

  // Fetch trending videos
  const fetchTrendingVideos = async () => {
    try {
      const { data: videos } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          view_count,
          like_count,
          comment_count,
          created_at,
          duration_seconds,
          creator_id
        `)
        .eq('visibility', 'public')
        .eq('processing_status', 'completed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('view_count', { ascending: false })
        .limit(20)

      setTrendingVideos(videos || [])
    } catch (error) {
      console.error('Error fetching trending videos:', error)
    }
  }

  // Fetch recent videos
  const fetchRecentVideos = async () => {
    try {
      const { data: videos } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          view_count,
          like_count,
          comment_count,
          created_at,
          duration_seconds,
          creator_id
        `)
        .eq('visibility', 'public')
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20)

      setRecentVideos(videos || [])
    } catch (error) {
      console.error('Error fetching recent videos:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
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

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchTrendingVideos(),
      fetchRecentVideos()
    ]).finally(() => setLoading(false))
  }, [session])

  const VideoCard = ({ video }: { video: any }) => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
          {formatDuration(video.duration_seconds)}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
          {video.title}
        </h3>
        
        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{video.view_count || 0} views</span>
            <span>{formatTimeAgo(video.created_at)}</span>
          </div>
          
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{video.like_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )

  const UserCard = ({ user }: { user: any }) => (
    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
      <img
        src={user.avatar_url || '/default-avatar.png'}
        alt={user.username}
        className="w-10 h-10 rounded-full object-cover"
      />
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-gray-900">
            {user.display_name || user.username}
          </h4>
          {user.is_verified && (
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <p className="text-sm text-gray-600">@{user.username}</p>
        <div className="flex items-center space-x-2 mt-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            user.account_type === 'creator' ? 'bg-blue-100 text-blue-800' :
            user.account_type === 'enterprise' ? 'bg-purple-100 text-purple-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {user.account_type}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Discover</h2>
        
        {/* Search input */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search for videos, creators..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value) {
                setActiveTab('search')
              }
            }}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'trending'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'recent'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Recent
          </button>
          {searchQuery && (
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'search'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Search Results
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Trending Videos */}
            {activeTab === 'trending' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Trending This Week</h3>
                {trendingVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {trendingVideos.map((video) => (
                      <VideoCard key={video.id} video={video} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No trending videos found</p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Videos */}
            {activeTab === 'recent' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recently Added</h3>
                {recentVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {recentVideos.map((video) => (
                      <VideoCard key={video.id} video={video} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recent videos found</p>
                  </div>
                )}
              </div>
            )}

            {/* Search Results */}
            {activeTab === 'search' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Search Results for "{searchQuery}"
                </h3>
                
                {searchResults.loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Searching...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Users */}
                    {searchResults.users.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-700 mb-3">Users</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {searchResults.users.map((user) => (
                            <UserCard key={user.id} user={user} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Videos */}
                    {searchResults.videos.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-700 mb-3">Videos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {searchResults.videos.map((video) => (
                            <VideoCard key={video.id} video={video} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No results */}
                    {searchResults.users.length === 0 && searchResults.videos.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-4">
                          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600">Try adjusting your search terms</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
