'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...')
  const [tableCount, setTableCount] = useState<number>(0)

  useEffect(() => {
    testConnection()
  }, [])

  async function testConnection() {
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact', head: true })

      if (error) {
        setConnectionStatus(`Error: ${error.message}`)
        return
      }

      // Test our schema tables exist
      const tables = ['users', 'videos', 'chapters', 'follows', 'likes', 'comments']
      let validTables = 0

      for (const table of tables) {
        try {
          const { error: tableError } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
          
          if (!tableError) {
            validTables++
          }
        } catch (e) {
          console.log(`Table ${table} check failed:`, e)
        }
      }

      setTableCount(validTables)
      setConnectionStatus(`✅ Connected! ${validTables}/6 Dojo tables verified`)

    } catch (error) {
      setConnectionStatus(`❌ Connection failed: ${error}`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        🗄️ Supabase Database Status
      </h2>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-600">Connection:</span>
          <span className="text-sm">{connectionStatus}</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-600">Database URL:</span>
          <span className="text-xs text-gray-500 font-mono">
            {process.env.NEXT_PUBLIC_SUPABASE_URL}
          </span>
        </div>

        {tableCount > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              🎉 Dojo platform database schema successfully deployed!
            </p>
            <p className="text-xs text-green-600 mt-1">
              Ready for user management, video processing, social features, and monetization.
            </p>
          </div>
        )}

        <button
          onClick={testConnection}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          Test Connection Again
        </button>
      </div>
    </div>
  )
}
