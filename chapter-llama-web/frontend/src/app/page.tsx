'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import EnhancedVideoManager from '@/components/EnhancedVideoManager'
import SocialDashboard from '@/components/SocialDashboard'
import AuthButton from '@/components/AuthButton'
import SupabaseTest from '@/components/SupabaseTest'

type MainView = 'videos' | 'social' | 'status'

export default function Home() {
  const { data: session, status } = useSession()
  const [activeView, setActiveView] = useState<MainView>('videos')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with Authentication */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dojo Platform</h1>
              <p className="text-sm text-gray-600">AI-Powered Social Video Chapter Platform</p>
            </div>
            <AuthButton />
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-gray-900">
              {session ? `Welcome back, ${session.user?.name || 'Creator'}!` : 'Welcome to Dojo'}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {session 
                ? 'Complete social video platform: Upload → Process → Share → Discover'
                : 'Please sign in to start creating and discovering AI-powered video chapters'
              }
            </p>
            {session && (
              <div className="inline-flex items-center px-4 py-2 bg-green-100 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-green-800">
                  ✅ Authenticated • Videos: Ready • Social: Active • AI: Ready
                </span>
              </div>
            )}
          </div>

          {status === 'authenticated' ? (
            <>
              {/* Navigation */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveView('videos')}
                    className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'videos'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>My Videos</span>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">AI Processing</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveView('social')}
                    className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'social'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <span>Social Hub</span>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">NEW</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveView('status')}
                    className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'status'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>System Status</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Content Views */}
              <div className="space-y-8">
                {activeView === 'videos' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Video Management</h3>
                      <p className="text-gray-600">Upload videos, generate AI chapters, and manage your content.</p>
                    </div>
                    <EnhancedVideoManager />
                  </div>
                )}

                {activeView === 'social' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Social Features</h3>
                      <p className="text-gray-600">Connect with creators, discover trending content, and build your community.</p>
                    </div>
                    <SocialDashboard />
                  </div>
                )}

                {activeView === 'status' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">System Status</h3>
                      <p className="text-gray-600">Monitor platform health and connectivity status.</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <SupabaseTest />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🔐 Authentication Required
                </h3>
                <p className="text-gray-600 mb-6">
                  Sign in with your Google or GitHub account to access the complete Dojo platform experience.
                </p>
                <AuthButton />
                
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">🚀 Phase 3: Social Platform Complete</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✅ Secure Video Upload & AI Processing</li>
                    <li>✅ User Profiles & Follow System</li>
                    <li>✅ Activity Feeds & Social Discovery</li>
                    <li>✅ Search & Trending Content</li>
                    <li>✅ Professional Chapter Management</li>
                    <li>✅ Real-time Social Interactions</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
