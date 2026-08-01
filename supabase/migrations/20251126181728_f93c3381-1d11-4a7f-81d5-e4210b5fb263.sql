-- Create table for daily goals per team
CREATE TABLE public.team_daily_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cod_equipe text NOT NULL UNIQUE,
  nome_equipe text NOT NULL,
  meta_diaria integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_daily_goals ENABLE ROW LEVEL SECURITY;

-- Admins can manage goals
CREATE POLICY "Admins manage daily goals"
ON public.team_daily_goals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Approved users can read goals
CREATE POLICY "Approved users read daily goals"
ON public.team_daily_goals
FOR SELECT
USING (is_approved(auth.uid()));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_team_daily_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_team_daily_goals_updated_at
BEFORE UPDATE ON public.team_daily_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_team_daily_goals_updated_at();

-- Insert default goals for all existing teams
INSERT INTO public.team_daily_goals (cod_equipe, nome_equipe, meta_diaria)
SELECT DISTINCT cod_equipe, nome_equipe, 10
FROM public.teams_vendors
ON CONFLICT (cod_equipe) DO NOTHING;