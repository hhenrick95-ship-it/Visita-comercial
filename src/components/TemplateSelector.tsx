import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText } from "lucide-react";
import { useFormTemplates, type FormTemplate } from "@/hooks/useFormTemplates";

interface TemplateSelectorProps {
  value: string; // template slug
  onValueChange: (slug: string, template: FormTemplate | null) => void;
  className?: string;
  /** Filter templates by capability. */
  filter?: (t: FormTemplate) => boolean;
  label?: string;
}

/**
 * Dropdown that lets the user switch between active form templates.
 * The legacy "visita" template is always present (system seed).
 */
export function TemplateSelector({
  value,
  onValueChange,
  className,
  filter,
  label = "Formulário",
}: TemplateSelectorProps) {
  const { templates, loading } = useFormTemplates({ activeOnly: true });

  const visible = filter ? templates.filter(filter) : templates;

  const handle = (slug: string) => {
    const t = visible.find((x) => x.slug === slug) || null;
    onValueChange(slug, t);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando formulários...
      </div>
    );
  }

  if (visible.length <= 1) {
    // Nothing to choose, render nothing (Visita-only experience).
    return null;
  }

  return (
    <div className={className}>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        {label}
      </label>
      <Select value={value} onValueChange={handle}>
        <SelectTrigger className="w-full md:w-[260px] glass-card border-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {visible.map((t) => (
            <SelectItem key={t.id} value={t.slug}>
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                {t.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}