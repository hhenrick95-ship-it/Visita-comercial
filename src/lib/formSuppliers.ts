import type { FormTemplate } from "@/hooks/useFormTemplates";
import logoLopes from "@/assets/logo-lopes.png";
import logoPepsico from "@/assets/logo-pepsico.jpg";

export interface Supplier {
  id: string;
  name: string;
  description: string;
  iconName: string; // lucide icon name
  prefixes: string[]; // slug prefixes that belong to this supplier
  badgeClass: string; // tailwind classes for the brand badge
  logo?: string; // imported image url for the supplier logo
}

/**
 * Lista central de fornecedores.
 *
 * Para adicionar um novo fornecedor:
 *   1. Adicione um novo objeto neste array.
 *   2. Garanta que os slugs dos formulários daquele fornecedor comecem
 *      com algum dos `prefixes` definidos.
 *
 * A ordem do array determina a ordem das seções na página.
 */
export const SUPPLIERS: Supplier[] = [
  {
    id: "lopes",
    name: "LOPES DISTRIBUIDORA",
    description: "Formulários internos de visita e feedback",
    iconName: "Building2",
    prefixes: ["visita", "feedback", "lopes-"],
    badgeClass: "bg-primary text-primary-foreground border-0",
    logo: logoLopes,
  },
  {
    id: "pepsico",
    name: "PEPSICO",
    description: "Programa de execução PEX",
    iconName: "Zap",
    prefixes: ["pex-", "pex"],
    badgeClass: "bg-hero-gradient text-primary-foreground border-0",
    logo: logoPepsico,
  },
];

const FALLBACK_SUPPLIER: Supplier = {
  id: "outros",
  name: "OUTROS",
  description: "Formulários sem fornecedor definido",
  iconName: "Package",
  prefixes: [],
  badgeClass: "bg-muted text-muted-foreground border-0",
};

export function getSupplierForSlug(slug: string | null | undefined): Supplier {
  const s = (slug || "").toLowerCase();
  for (const supplier of SUPPLIERS) {
    if (supplier.prefixes.some((p) => s.startsWith(p))) {
      return supplier;
    }
  }
  return FALLBACK_SUPPLIER;
}

export interface SupplierGroup {
  supplier: Supplier;
  templates: FormTemplate[];
}

export function groupTemplatesBySupplier(
  templates: FormTemplate[]
): SupplierGroup[] {
  const map = new Map<string, SupplierGroup>();

  // Pre-populate in declared order to keep section ordering stable.
  for (const supplier of SUPPLIERS) {
    map.set(supplier.id, { supplier, templates: [] });
  }

  for (const t of templates) {
    const supplier = getSupplierForSlug(t.slug);
    const existing = map.get(supplier.id);
    if (existing) {
      existing.templates.push(t);
    } else {
      map.set(supplier.id, { supplier, templates: [t] });
    }
  }

  // Drop empty groups.
  return Array.from(map.values()).filter((g) => g.templates.length > 0);
}
