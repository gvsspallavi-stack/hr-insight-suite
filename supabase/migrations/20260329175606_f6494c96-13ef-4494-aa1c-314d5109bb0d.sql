
-- Create profile-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users upload own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] IN (
  SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
));

-- Allow authenticated users to update their own photos
CREATE POLICY "Users update own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] IN (
  SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
));

-- Allow public read access to profile photos
CREATE POLICY "Public read profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
