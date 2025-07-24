import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Add user ID to session
      if (user) {
        session.user.id = user.id
        
        // Fetch user profile from our custom users table
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (userProfile) {
          session.user.username = userProfile.username
          session.user.account_type = userProfile.account_type
          session.user.is_verified = userProfile.is_verified
        }
      }

      return session
    },
    async signIn({ user, account, profile }) {
      if (!user.id) return false

      // Create or update user in our custom users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        // Create new user record
        const username = profile?.login || // GitHub username
                        user.email?.split('@')[0] || // Email prefix
                        `user_${user.id.slice(0, 8)}` // Fallback

        const { error } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            username,
            display_name: user.name,
            avatar_url: user.image,
            account_type: 'viewer'
          })

        if (error) {
          console.error('Error creating user:', error)
          return false
        }
      }

      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
  },
  debug: process.env.NODE_ENV === 'development',
}
