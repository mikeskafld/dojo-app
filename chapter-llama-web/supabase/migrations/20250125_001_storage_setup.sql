-- =====================================================
-- SUPABASE STORAGE CONFIGURATION
-- Video upload buckets and security policies for Dojo platform
-- =====================================================

-- Create storage buckets for video uploads, thumbnails, and avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('videos', 'videos', false, 524288000, ARRAY['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv']),
  ('thumbnails', 'thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES FOR SECURE FILE ACCESS
-- =====================================================

-- Videos bucket policies (private with user-specific access)
CREATE POLICY "Users can upload their own videos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own videos" ON storage.objects  
FOR SELECT TO authenticated
USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own videos" ON storage.objects
FOR UPDATE TO authenticated  
USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own videos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Thumbnails bucket policies (public read, authenticated write)
CREATE POLICY "Anyone can view thumbnails" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'thumbnails');

CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Users can update their own thumbnails" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'thumbnails' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own thumbnails" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'thumbnails' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatars bucket policies (public read, authenticated write)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
