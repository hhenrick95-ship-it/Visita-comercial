
-- Tabela para armazenar slides do tutorial
CREATE TABLE public.tutorial_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_order integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'content' CHECK (type IN ('cover', 'content', 'table', 'diagram', 'highlight')),
  block text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  subtitle text,
  screenshot_url text,
  items jsonb, -- array of {icon: string, text: string}
  table_data jsonb, -- {headers: string[], rows: string[][]}
  diagram_nodes jsonb, -- array of {label: string, color: string}
  highlight_value text,
  highlight_label text,
  highlight_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutorial_slides ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler slides
CREATE POLICY "Authenticated users can view tutorial slides"
ON public.tutorial_slides FOR SELECT TO authenticated
USING (true);

-- Apenas admin pode inserir
CREATE POLICY "Admins can insert tutorial slides"
ON public.tutorial_slides FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admin pode atualizar
CREATE POLICY "Admins can update tutorial slides"
ON public.tutorial_slides FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Apenas admin pode deletar
CREATE POLICY "Admins can delete tutorial slides"
ON public.tutorial_slides FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_tutorial_slides_updated_at
BEFORE UPDATE ON public.tutorial_slides
FOR EACH ROW
EXECUTE FUNCTION public.update_team_daily_goals_updated_at();

-- Bucket para imagens do tutorial (público para exibição)
INSERT INTO storage.buckets (id, name, public) VALUES ('tutorial-images', 'tutorial-images', true);

-- Qualquer pessoa autenticada pode ver
CREATE POLICY "Public read access for tutorial images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tutorial-images');

-- Admins podem fazer upload
CREATE POLICY "Admins can upload tutorial images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tutorial-images' AND public.has_role(auth.uid(), 'admin'));

-- Admins podem deletar
CREATE POLICY "Admins can delete tutorial images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tutorial-images' AND public.has_role(auth.uid(), 'admin'));

-- Admins podem atualizar
CREATE POLICY "Admins can update tutorial images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tutorial-images' AND public.has_role(auth.uid(), 'admin'));
