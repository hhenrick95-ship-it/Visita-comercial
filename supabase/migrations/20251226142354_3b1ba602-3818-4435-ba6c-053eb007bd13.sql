-- Create storage bucket for visit PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('visit-pdfs', 'visit-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload PDFs
CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'visit-pdfs');

-- Policy: Authenticated users can view their PDFs
CREATE POLICY "Authenticated users can view PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'visit-pdfs');

-- Policy: Authenticated users can update PDFs
CREATE POLICY "Authenticated users can update PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'visit-pdfs');

-- Policy: Authenticated users can delete PDFs
CREATE POLICY "Authenticated users can delete PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'visit-pdfs');