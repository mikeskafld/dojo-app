import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username?: string
      account_type?: 'viewer' | 'creator' | 'enterprise'
      is_verified?: boolean
    }
  }

  interface User {
    id: string
    username?: string
    account_type?: 'viewer' | 'creator' | 'enterprise'
    is_verified?: boolean
  }
}
