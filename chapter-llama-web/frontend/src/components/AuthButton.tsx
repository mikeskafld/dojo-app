'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'

export default function AuthButton() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)

  if (status === 'loading') {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-full bg-gray-300 h-8 w-8"></div>
        <div className="rounded bg-gray-300 h-8 w-20"></div>
      </div>
    )
  }

  if (session) {
    return (
      <div className="flex items-center space-x-4">
        {/* User Avatar */}
        <img
          src={session.user?.image || '/default-avatar.png'}
          alt={session.user?.name || 'User'}
          className="h-8 w-8 rounded-full"
        />
        
        {/* User Info */}
        <div className="hidden md:block">
          <p className="text-sm font-medium text-gray-900">
            {session.user?.name}
          </p>
          <p className="text-xs text-gray-500">
            {session.user?.email}
          </p>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={async () => {
            setLoading(true)
            await signOut({ callbackUrl: '/' })
            setLoading(false)
          }}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={async () => {
        setLoading(true)
        await signIn()
        setLoading(false)
      }}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {loading ? 'Signing in...' : 'Sign in'}
    </button>
  )
}
