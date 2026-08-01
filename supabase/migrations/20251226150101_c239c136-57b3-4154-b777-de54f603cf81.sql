-- Create feedback_templates table
CREATE TABLE public.feedback_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  constructive_criticism TEXT NOT NULL,
  action_plan TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view public templates and their own
CREATE POLICY "Users can view public templates and own"
ON public.feedback_templates
FOR SELECT
USING (is_public = true OR created_by = auth.uid());

-- Users can create their own templates
CREATE POLICY "Users can create own templates"
ON public.feedback_templates
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
ON public.feedback_templates
FOR UPDATE
USING (auth.uid() = created_by);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
ON public.feedback_templates
FOR DELETE
USING (auth.uid() = created_by);

-- Admins can manage all templates
CREATE POLICY "Admins manage all templates"
ON public.feedback_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous access
CREATE POLICY "Block anonymous access to feedback_templates"
ON public.feedback_templates
FOR ALL
USING (auth.uid() IS NOT NULL);