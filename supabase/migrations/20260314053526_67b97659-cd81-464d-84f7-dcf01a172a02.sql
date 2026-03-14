-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true);

-- Allow admins to upload/manage all files
CREATE POLICY "Admins manage all certificates"
ON storage.objects FOR ALL
USING (bucket_id = 'certificates' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'certificates' AND public.has_role(auth.uid(), 'admin'));

-- Allow employees to view their own certificates (path starts with their profile id)
CREATE POLICY "Employees view own certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificates' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);