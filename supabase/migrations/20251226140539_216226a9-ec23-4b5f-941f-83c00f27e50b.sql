-- Fix STORAGE_EXPOSURE: Make form-images bucket private and update RLS policies

-- 1. Update bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'form-images';

-- 2. Drop the overly permissive public view policy
DROP POLICY IF EXISTS "Anyone can view form images" ON storage.objects;

-- 3. Create policy for approved users to view form images
CREATE POLICY "Approved users view form images"
ON storage.objects FOR SELECT
USING (bucket_id = 'form-images' AND is_approved(auth.uid()));

-- 4. Ensure approved users can still upload images
DROP POLICY IF EXISTS "Approved users upload form images" ON storage.objects;
CREATE POLICY "Approved users upload form images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'form-images' AND is_approved(auth.uid()));

-- 5. Ensure approved users can delete their own images
DROP POLICY IF EXISTS "Approved users delete form images" ON storage.objects;
CREATE POLICY "Approved users delete form images"
ON storage.objects FOR DELETE
USING (bucket_id = 'form-images' AND is_approved(auth.uid()));