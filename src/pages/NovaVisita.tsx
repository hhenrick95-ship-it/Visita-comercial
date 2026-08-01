import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFormTemplates } from "@/hooks/useFormTemplates";
import { ArrowLeft, ArrowRight, PlusCircle, Sparkles } from "lucide-react";
import * as Icons from "lucide-react";
import { groupTemplatesBySupplier, type Supplier } from "@/lib/formSuppliers";

export default function NovaVisita() {
  const { templates, loading } = useFormTemplates({ activeOnly: true });
  const groups = groupTemplatesBySupplier(templates);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl">
        {/* Voltar */}
        <div className="mb-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>

        {/* Hero */}
        <section className="glass-card rounded-2xl p-6 md:p-10 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient opacity-10 pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Nova Visita
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Qual formulário você quer preencher?
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Os formulários estão organizados por fornecedor. Escolha o tipo
              de registro adequado à sua atividade.
            </p>
          </div>
        </section>

        {/* Seções por fornecedor */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="glass-card rounded-xl p-5 h-40 animate-pulse"
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card className="glass-card border-0">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum formulário ativo no momento. Solicite ao administrador
              para cadastrar um novo modelo.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {groups.map(({ supplier, templates: list }) => (
              <SupplierSection
                key={supplier.id}
                supplier={supplier}
                templates={list}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function SupplierSection({
  supplier,
  templates,
}: {
  supplier: Supplier;
  templates: ReturnType<typeof groupTemplatesBySupplier>[number]["templates"];
}) {
  const SupplierIcon = (Icons as any)[supplier.iconName] || Icons.Package;
  return (
    <section>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          {supplier.logo ? (
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-white shadow-sm border border-border/40 shrink-0 overflow-hidden p-1.5">
              <img
                src={supplier.logo}
                alt={`Logo ${supplier.name}`}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-hero-gradient text-primary-foreground shrink-0">
              <SupplierIcon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight leading-tight">
              {supplier.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {supplier.description}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {templates.length} formulário{templates.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <TemplateChoiceCard
            key={t.id}
            to={t.slug === "visita" ? "/visitas/nova/visita-comercial" : `/form/${t.slug}`}
            name={t.name}
            description={t.description || ""}
            iconName={t.icon || "FileText"}
            isSystem={t.is_system}
            brand={supplier.id === "outros" ? undefined : supplier.name}
            brandClass={supplier.badgeClass}
            brandLogo={supplier.logo}
          />
        ))}
      </div>
    </section>
  );
}

function TemplateChoiceCard({
  to,
  name,
  description,
  iconName,
  isSystem,
  brand,
  brandClass,
  brandLogo,
}: {
  to: string;
  name: string;
  description: string;
  iconName: string;
  isSystem: boolean;
  brand?: string;
  brandClass?: string;
  brandLogo?: string;
}) {
  const IconComp = (Icons as any)[iconName] || Icons.FileText;
  return (
    <Link to={to} className="group block h-full">
      <div className="glass-card rounded-xl p-5 h-full relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="absolute inset-0 bg-hero-gradient opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity" />
        <div className="relative flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            {brandLogo ? (
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-white shadow-sm border border-border/40 overflow-hidden p-2">
                <img
                  src={brandLogo}
                  alt={brand ? `Logo ${brand}` : ""}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-hero-gradient text-primary-foreground">
                <IconComp className="h-7 w-7" />
              </div>
            )}
            <div className="flex flex-col items-end gap-1.5">
              {brand && (
                <Badge
                  className={`text-[10px] ${
                    brandClass || "bg-hero-gradient text-primary-foreground border-0"
                  }`}
                >
                  {brand}
                </Badge>
              )}
              {isSystem && (
                <Badge variant="secondary" className="text-[10px]">
                  Padrão
                </Badge>
              )}
            </div>
          </div>
          <h3 className="font-semibold text-base mb-1">{name}</h3>
          <p className="text-xs text-muted-foreground flex-1 line-clamp-3">
            {description || "Iniciar novo registro"}
          </p>
          <div className="flex items-center text-sm text-primary mt-4 font-medium">
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Iniciar
            <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
