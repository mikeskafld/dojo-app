'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import UserProfile from './UserProfile'
import ActivityFeed from './ActivityFeed'
import SearchAndDiscovery from './SearchAndDiscovery'

type DashboardView = 'feed' | 'discover' | 'profile'

export default function SocialDashboard() {
  const { data: session } = useSession()
  const [activeView, setActiveView] = useState<DashboardView>('feed')

  if (!session) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Social Features</h3>
        <p className="text-gray-600">Please sign in to access social features like following creators and activity feeds</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Social Hub</h2>
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('feed')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeView === 'feed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Activity Feed</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveView('discover')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeView === 'discover'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Discover</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveView('profile')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeView === 'profile'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>My Profile</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeView === 'feed' && <ActivityFeed />}
        {activeView === 'discover' && <SearchAndDiscovery />}
        {activeView === 'profile' && <UserProfile isEditable={true} />}
      </div>
    </div>
  )
}
