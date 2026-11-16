DROP POLICY IF EXISTS "Authenticated users can view tutorial slides" ON public.tutorial_slides;
CREATE POLICY "Approved users can view tutorial slides" ON public.tutorial_slides FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
DROP POLICY IF EXISTS "Public read access for tutorial images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view tutorial images" ON storage.objects;
CREATE POLICY "Approved users can view tutorial images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tutorial-images' AND public.is_approved(auth.uid()));