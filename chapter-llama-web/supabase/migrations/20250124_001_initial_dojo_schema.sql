-- =====================================================
-- DOJO PLATFORM DATABASE SCHEMA
-- Comprehensive schema for social video chaptering platform
-- Based on Creative Phase design specifications
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================
-- 1. AUTHENTICATION & USER MANAGEMENT
-- =====================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL CHECK (length(username) >= 3),
  display_name VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT CHECK (length(bio) <= 500),
  location VARCHAR(100),
  website_url TEXT,
  
  -- Account type and status
  account_type VARCHAR(20) DEFAULT 'viewer' CHECK (account_type IN ('viewer', 'creator', 'enterprise')),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Privacy settings
  profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'unlisted', 'private')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creator profiles (additional data for content creators)
CREATE TABLE public.creator_profiles (
  user_id UUID REFERENCES public.users(id) PRIMARY KEY,
  
  -- Creator-specific info
  channel_name VARCHAR(100),
  category VARCHAR(50),
  subscriber_count INTEGER DEFAULT 0,
  total_video_count INTEGER DEFAULT 0,
  total_view_count BIGINT DEFAULT 0,
  
  -- Monetization settings
  monetization_enabled BOOLEAN DEFAULT false,
  subscription_price_monthly DECIMAL(10,2),
  subscription_price_yearly DECIMAL(10,2),
  payout_method VARCHAR(50),
  payout_details JSONB,
  
  -- Analytics tracking
  analytics_enabled BOOLEAN DEFAULT true,
  public_stats BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 2. CONTENT MANAGEMENT
-- =====================================

-- Videos table
CREATE TABLE public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.users(id) NOT NULL,
  
  -- Basic video information
  title VARCHAR(200) NOT NULL CHECK (length(title) >= 5),
  description TEXT CHECK (length(description) <= 5000),
  thumbnail_url TEXT,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  
  -- File management
  original_filename VARCHAR(255),
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  video_quality VARCHAR(10) DEFAULT 'HD',
  
  -- Processing status
  processing_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'review_needed')),
  processing_error TEXT,
  ai_confidence_score DECIMAL(3,2) CHECK (ai_confidence_score BETWEEN 0 AND 1),
  
  -- Content metadata
  category VARCHAR(50),
  tags TEXT[],
  language VARCHAR(10) DEFAULT 'en',
  content_rating VARCHAR(10) DEFAULT 'general' 
    CHECK (content_rating IN ('general', 'mature', 'educational', 'enterprise')),
  
  -- Visibility and access
  visibility VARCHAR(20) DEFAULT 'public' 
    CHECK (visibility IN ('public', 'unlisted', 'private', 'subscribers_only')),
  is_premium BOOLEAN DEFAULT false,
  
  -- Engagement metrics (denormalized for performance)
  view_count BIGINT DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Chapters table (AI-generated and human-edited)
CREATE TABLE public.chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  
  -- Chapter timing and content
  timestamp_seconds DECIMAL(10,3) NOT NULL CHECK (timestamp_seconds >= 0),
  duration_seconds DECIMAL(10,3) NOT NULL CHECK (duration_seconds > 0),
  title VARCHAR(200) NOT NULL CHECK (length(title) >= 3),
  description TEXT CHECK (length(description) <= 1000),
  thumbnail_url TEXT,
  
  -- AI processing metadata
  ai_generated BOOLEAN DEFAULT true,
  ai_confidence_score DECIMAL(3,2) CHECK (ai_confidence_score BETWEEN 0 AND 1),
  human_edited BOOLEAN DEFAULT false,
  needs_review BOOLEAN DEFAULT false,
  
  -- Engagement tracking
  view_count BIGINT DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 3. SOCIAL FEATURES
-- =====================================

-- Follows relationship
CREATE TABLE public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) NOT NULL,
  following_id UUID REFERENCES public.users(id) NOT NULL,
  
  -- Follow metadata
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Likes (videos and chapters)
CREATE TABLE public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  video_id UUID REFERENCES public.videos(id),
  chapter_id UUID REFERENCES public.chapters(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, video_id, chapter_id),
  CHECK ((video_id IS NOT NULL) OR (chapter_id IS NOT NULL))
);

-- Comments system
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  video_id UUID REFERENCES public.videos(id),
  chapter_id UUID REFERENCES public.chapters(id),
  parent_id UUID REFERENCES public.comments(id),
  
  -- Comment content
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  is_edited BOOLEAN DEFAULT false,
  
  -- Moderation
  is_deleted BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false,
  moderation_status VARCHAR(20) DEFAULT 'approved' 
    CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'auto_flagged')),
  
  -- Engagement
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK ((video_id IS NOT NULL) OR (chapter_id IS NOT NULL))
);

-- =====================================
-- 4. MONETIZATION & SUBSCRIPTIONS
-- =====================================

-- Subscription plans
CREATE TABLE public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.users(id) NOT NULL,
  
  -- Plan details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL CHECK (price_monthly >= 0),
  price_yearly DECIMAL(10,2) CHECK (price_yearly >= 0),
  
  -- Plan features
  features JSONB,
  max_video_access INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID REFERENCES public.users(id) NOT NULL,
  creator_id UUID REFERENCES public.users(id) NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id),
  
  -- Subscription details
  status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'cancelled', 'expired', 'payment_failed')),
  billing_cycle VARCHAR(20) DEFAULT 'monthly' 
    CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Payment tracking
  stripe_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(subscriber_id, creator_id)
);

-- =====================================
-- 5. PERFORMANCE INDEXES
-- =====================================

-- User lookup indexes
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_account_type ON public.users(account_type);

-- Video discovery indexes
CREATE INDEX idx_videos_creator_id ON public.videos(creator_id);
CREATE INDEX idx_videos_visibility ON public.videos(visibility);
CREATE INDEX idx_videos_category ON public.videos(category);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX idx_videos_view_count ON public.videos(view_count DESC);
CREATE INDEX idx_videos_tags ON public.videos USING GIN(tags);

-- Chapter performance indexes
CREATE INDEX idx_chapters_video_id ON public.chapters(video_id);
CREATE INDEX idx_chapters_timestamp ON public.chapters(video_id, timestamp_seconds);

-- Social features indexes
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_likes_user_id ON public.likes(user_id);
CREATE INDEX idx_likes_video_id ON public.likes(video_id);
CREATE INDEX idx_comments_video_id ON public.comments(video_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);

-- Search indexes
CREATE INDEX idx_videos_title_search ON public.videos USING GIN(to_tsvector('english', title));
CREATE INDEX idx_videos_description_search ON public.videos USING GIN(to_tsvector('english', description));
CREATE INDEX idx_chapters_title_search ON public.chapters USING GIN(to_tsvector('english', title));
