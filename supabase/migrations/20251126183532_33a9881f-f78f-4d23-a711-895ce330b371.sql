-- Create table for dashboard layout configuration
CREATE TABLE IF NOT EXISTS public.dashboard_layout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_order JSONB NOT NULL DEFAULT '["goals", "kpis", "charts", "map", "visits"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default layout
INSERT INTO public.dashboard_layout (id, component_order) 
VALUES ('00000000-0000-0000-0000-000000000001', '["goals", "kpis", "charts", "map", "visits"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.dashboard_layout ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view the layout
CREATE POLICY "Everyone can view dashboard layout"
ON public.dashboard_layout
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can update layout
CREATE POLICY "Admins can update dashboard layout"
ON public.dashboard_layout
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));