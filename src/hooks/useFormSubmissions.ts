import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FormSubmissionRecord {
  id: string;
  template_id: string;
  created_at: string;
  submitted_at: string;
  visit_date: string;
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
      const { data: dates, error: dateError } = await supabase.rpc("get_form_submission_dates", {
        p_template_id: templateId,
      });
      if (dateError) throw dateError;
      const dateMap = new Map((dates || []).map((row) => [row.id, row.visit_date]));
      setSubmissions((data || []).map((row: FormSubmissionRecord) => ({
        ...row,
        visit_date: dateMap.get(row.id) || row.submitted_at.slice(0, 10),
      })).sort((a: FormSubmissionRecord, b: FormSubmissionRecord) =>
        b.visit_date.localeCompare(a.visit_date) || b.submitted_at.localeCompare(a.submitted_at)
      ));
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