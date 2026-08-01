import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TutorialSlideScreenshot {
  url: string;
  width?: number;
}

export interface TutorialSlide {
  id: string;
  display_order: number;
  type: "cover" | "content" | "table" | "diagram" | "highlight";
  block: string;
  title: string;
  subtitle?: string | null;
  screenshot_url?: string | null;
  screenshot_position?: string | null;
  screenshot_layout?: string | null;
  screenshots?: TutorialSlideScreenshot[] | null;
  items?: { icon: string; text: string }[] | null;
  table_data?: { headers: string[]; rows: string[][] } | null;
  diagram_nodes?: { label: string; color: string }[] | null;
  highlight_value?: string | null;
  highlight_label?: string | null;
  highlight_description?: string | null;
}

export function useTutorialSlides() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tutorial-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutorial_slides")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as TutorialSlide[]) ?? [];
    },
  });

  const upsertSlide = useMutation({
    mutationFn: async (slide: Partial<TutorialSlide> & { id?: string }) => {
      if (slide.id) {
        const { error } = await supabase
          .from("tutorial_slides")
          .update(slide as any)
          .eq("id", slide.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tutorial_slides")
          .insert(slide as any);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tutorial-slides"] }),
  });

  const deleteSlide = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tutorial_slides")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tutorial-slides"] }),
  });

  const reorderSlides = useMutation({
    mutationFn: async (slides: { id: string; display_order: number }[]) => {
      for (const s of slides) {
        const { error } = await supabase
          .from("tutorial_slides")
          .update({ display_order: s.display_order } as any)
          .eq("id", s.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tutorial-slides"] }),
  });

  const uploadScreenshot = async (file: File, slideId: string, index?: number) => {
    const ext = file.name.split(".").pop();
    const suffix = index !== undefined ? `_${index}` : "";
    const path = `${slideId}${suffix}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("tutorial-images")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage
      .from("tutorial-images")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    slides: query.data ?? [],
    isLoading: query.isLoading,
    upsertSlide,
    deleteSlide,
    reorderSlides,
    uploadScreenshot,
  };
}
