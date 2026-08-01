-- Enum para roles (admin e gestor)
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor');

-- Tabela de perfis (criada automaticamente no signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de roles (SEM role = pendente, COM role = aprovado)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Função segura para verificar role (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se tem qualquer role (está aprovado)
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- Trigger para criar perfil no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  -- Se for o email do admin, aprovar automaticamente como admin
  IF new.email = 'aleander.anjos@distribuidoralopes.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
  END IF;
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies para user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Atualizar RLS de teams_vendors
DROP POLICY IF EXISTS "Anyone can read teams_vendors" ON public.teams_vendors;

CREATE POLICY "Admins manage teams" ON public.teams_vendors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved users read teams" ON public.teams_vendors
  FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()));

-- Atualizar RLS de visit_forms
DROP POLICY IF EXISTS "Anyone can read visit forms" ON public.visit_forms;
DROP POLICY IF EXISTS "Anyone can submit visit forms" ON public.visit_forms;

CREATE POLICY "Approved users read visit forms" ON public.visit_forms
  FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users submit visit forms" ON public.visit_forms
  FOR INSERT TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));

-- Atualizar RLS de feedbacks
DROP POLICY IF EXISTS "Anyone can read feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Anyone can submit feedbacks" ON public.feedbacks;

CREATE POLICY "Approved users read feedbacks" ON public.feedbacks
  FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users submit feedbacks" ON public.feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));