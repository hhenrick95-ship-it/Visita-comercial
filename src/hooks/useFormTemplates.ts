import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FormTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  is_system: boolean;
  requires_geolocation: boolean;
  generates_pdf: boolean;
  ai_analysis_config: any;
  dashboard_config: any;
  display_order: number;
}

export function useFormTemplates(opts: { activeOnly?: boolean } = {}) {
  const { activeOnly = true } = opts;
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("form_templates" as any)
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      setTemplates((data || []) as unknown as FormTemplate[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return { templates, loading, error, reload: load };
}

export function useFormTemplate(slug: string | undefined) {
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("form_templates" as any)
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled) {
          setTemplate((prev) => {
            const next = (data as unknown as FormTemplate) || null;
            // Evita criar nova referência se o id não mudou (estabiliza
            // useEffects que dependem de template.id em consumidores).
            if (prev && next && prev.id === next.id) return prev;
            return next;
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { template, loading, error };
}
