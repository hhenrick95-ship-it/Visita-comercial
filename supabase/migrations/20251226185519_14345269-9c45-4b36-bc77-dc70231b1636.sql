-- Add must_reset_password column to profiles table
ALTER TABLE public.profiles ADD COLUMN must_reset_password boolean DEFAULT false;

-- Create policy for admins to update must_reset_password
CREATE POLICY "Admins can set must_reset_password"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));