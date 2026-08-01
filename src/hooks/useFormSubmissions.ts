import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FormSubmissionRecord {
  id: string;
  template_id: string;
  created_at: string;
  submitted_at: string;
  created_by: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  pdf_path: string | null;
  metadata: Record<string, any>;
}

/**
 * Loads submissions for a generic template (form_submissions table).
 * Used by the generic dashboard/list view for non-"visita" templates.
 */
export function useFormSubmissions(templateId: string | undefined) {
  const [submissions, setSubmissions] = useState<FormSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!templateId) {
      setSubmissions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client: any = supabase.from("form_submissions");
      const { data, error } = await client
        .select("*")
        .eq("template_id", templateId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      setSubmissions((data || []) as FormSubmissionRecord[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  return { submissions, loading, error, reload: load };
}