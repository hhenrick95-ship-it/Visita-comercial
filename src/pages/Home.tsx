import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardList,
  BarChart3,
  MessageSquare,
  ListChecks,
  MapPinOff,
  Users,
  UsersRound,
  Settings as SettingsIcon,
  ArrowRight,
  Calendar,
  TrendingUp,
  Trophy,
  Sparkles,
  PlusCircle,
  UserCog,
} from "lucide-react";
import { getShortManagerName } from "@/lib/normalizeManager";
import { formatDateOnlyPtBR, toDateOnlyString } from "@/lib/utils";
import { useFormTemplates } from "@/hooks/useFormTemplates";
import * as Icons from "lucide-react";
import { getSupplierForSlug } from "@/lib/formSuppliers";
import logoLopes from "@/assets/logo-lopes.png";

interface VisitLite {
  id: string;
  visit_date: string;
  manager: string;
  rca_accompanied: string;
  client_code: string;
  created_at: string | null;
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const formatLongDate = (d: Date) => {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export default function Home() {
  const { user, role } = useAuth();
  const [visits, setVisits] = useState<VisitLite[]>([]);
  const [globalTopManagers, setGlobalTopManagers] = useState<{ manager: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { templates: activeTemplates, loading: templatesLoading } = useFormTemplates({ activeOnly: true });

  const isAdmin = role === "admin";

  const loadAll = async () => {
    try {
      const [visitsRes, topRes] = await Promise.all([
        supabase.rpc("get_all_visits_for_dashboard"),
        supabase.rpc("get_top_managers_current_month"),
      ]);
      if (!visitsRes.error && visitsRes.data) setVisits(visitsRes.data as VisitLite[]);
      if (!topRes.error && topRes.data) {
        setGlobalTopManagers(
          (topRes.data as { manager: string; count: number }[]).map((m) => ({
            manager: m.manager,
            count: Number(m.count),
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === null) return;

    setLoading(true);
    loadAll();
    const onFocus = () => loadAll();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [role]);

  const stats = useMemo(() => {
    const today = toDateOnlyString(new Date());
    const now = new Date();
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - now.getDay());
    const startWeekStr = toDateOnlyString(startWeek);
    const startMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const todayCount = visits.filter((v) => v.visit_date === today).length;
    const weekCount = visits.filter((v) => v.visit_date >= startWeekStr).length;
    const monthCount = visits.filter((v) => v.visit_date >= startMonthStr).length;

    return { todayCount, weekCount, monthCount, total: visits.length };
  }, [visits]);

  const recentVisits = useMemo(() => {
    return [...visits]
      .sort((a, b) => {
        // Ordena por data da visita (DESC) e desempata por created_at (DESC)
        const dateCmp = (b.visit_date || "").localeCompare(a.visit_date || "");
        if (dateCmp !== 0) return dateCmp;
        return (b.created_at || "").localeCompare(a.created_at || "");
      })
      .slice(0, 5);
  }, [visits]);

  const topManagers = useMemo(() => {
    return globalTopManagers;
  }, [globalTopManagers]);

  const userName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "";

  // Quick actions (filtered by role)
  const quickActions = [
    {
      to: "/dashboard",
      label: "Dashboard",
      desc: "Métricas e indicadores",
      icon: BarChart3,
      roles: ["admin", "gestor", "usuario"],
    },
    {
      to: "/visitas",
      label: "Visitas",
      desc: "Histórico completo",
      icon: ListChecks,
      roles: ["admin", "gestor", "usuario"],
    },
    {
      to: "/feedbacks",
      label: "Feedbacks",
      desc: "Notas para a equipe",
      icon: MessageSquare,
      roles: ["admin", "gestor", "usuario"],
    },
    {
      to: "/clientes/atualizacao-cadastral",
      label: "Atualização Cadastral",
      desc: "Atualize dados dos clientes por RCA",
      icon: UserCog,
      roles: ["admin", "gestor", "usuario"],
    },
    {
      to: "/sem-localizacao",
      label: "Sem Localização",
      desc: "Auditoria de GPS",
      icon: MapPinOff,
      roles: ["admin"],
    },
    {
      to: "/users",
      label: "Usuários",
      desc: "Gerenciar acessos",
      icon: Users,
      roles: ["admin"],
    },
    {
      to: "/team-management",
      label: "Equipes",
      desc: "Estrutura comercial",
      icon: UsersRound,
      roles: ["admin"],
    },
    {
      to: "/form-builder",
      label: "Construtor de Formulários",
      desc: "Criar e editar formulários",
      icon: SettingsIcon,
      roles: ["admin"],
    },
  ].filter((a) => a.roles.includes(role || ""));

  return (
    <Layout>
      {/* Mesh background */}
      <div className="relative min-h-[calc(100vh-4rem)] bg-mesh">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Hero / Saudação */}
          <section className="relative overflow-hidden rounded-2xl glass-card p-6 md:p-10">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-hero-gradient opacity-30 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-hero-gradient opacity-20 blur-3xl pointer-events-none" />

            <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="capitalize">{formatLongDate(new Date())}</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                  {greeting()},{" "}
                  <span className="bg-hero-gradient bg-clip-text text-transparent">
                    {userName}
                  </span>
                  !
                </h1>
                <p className="text-muted-foreground max-w-xl">
                  Bem-vindo à <span className="font-semibold text-foreground">LOPES DISTRIBUIDORA</span>.
                  Comece registrando uma nova visita ou acompanhe os indicadores da equipe.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <img
                  src={logoLopes}
                  alt="Logo Lopes Distribuidora"
                  className="h-16 md:h-20 w-auto object-contain opacity-90"
                />
                <div className="flex flex-wrap gap-3">
                  <Link to="/visitas/nova">
                    <Button size="lg" className="bg-hero-gradient text-primary-foreground border-0 shadow-lg hover:opacity-95">
                      <PlusCircle className="h-5 w-5 mr-2" />
                      Nova Visita
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button size="lg" variant="outline" className="glass-card border-0">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Ver Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Resumo do dia/mês */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Calendar}
              label="Visitas hoje"
              value={stats.todayCount}
              loading={loading}
              accent="primary"
            />
            <StatCard
              icon={TrendingUp}
              label="Esta semana"
              value={stats.weekCount}
              loading={loading}
              accent="secondary"
            />
            <StatCard
              icon={ClipboardList}
              label="Este mês"
              value={stats.monthCount}
              loading={loading}
              accent="primary"
            />
            <StatCard
              icon={Trophy}
              label="Total no sistema"
              value={stats.total}
              loading={loading}
              accent="secondary"
            />
          </section>

          {/* Formulários disponíveis */}
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">Novo registro</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escolha o tipo de formulário para registrar
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {activeTemplates.length} disponíve{activeTemplates.length === 1 ? "l" : "is"}
              </span>
            </div>
            {templatesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-card rounded-xl p-5 h-32 animate-pulse" />
                ))}
              </div>
            ) : activeTemplates.length === 0 ? (
              <Card className="glass-card border-0">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum formulário ativo. {isAdmin && "Cadastre em Construtor de Formulários."}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTemplates.map((t) => (
                  <FormTemplateCard
                    key={t.id}
                    to={t.slug === "visita" ? "/visitas/nova/visita-comercial" : `/form/${t.slug}`}
                    name={t.name}
                    description={t.description || ""}
                    iconName={t.icon || "FileText"}
                    isSystem={t.is_system}
                    slug={t.slug}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Centro de ações rápidas */}
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold">Ações rápidas</h2>
              <span className="text-xs text-muted-foreground">
                {quickActions.length} disponíveis
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <ActionCard key={action.to} {...action} />
              ))}
            </div>
          </section>

          {/* Top gestores + Últimas visitas */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="glass-card border-0 lg:col-span-2 lg:order-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Top 5 gestores do mês
                </CardTitle>
                <CardDescription>Ranking por visitas registradas no mês</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
                ) : topManagers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Sem visitas neste mês.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {topManagers.map((m, idx) => (
                      <li
                        key={m.manager}
                        className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold shrink-0 ${
                              idx === 0
                                ? "bg-hero-gradient text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium truncate" title={m.manager}>
                            {getShortManagerName(m.manager)}
                          </span>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {m.count}
                        </Badge>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-0 lg:col-span-3 lg:order-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Últimas visitas
                  </CardTitle>
                  <CardDescription>5 registros mais recentes</CardDescription>
                </div>
                <Link to="/visitas">
                  <Button variant="ghost" size="sm">
                    Ver todas <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
                ) : recentVisits.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nenhuma visita registrada ainda.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {recentVisits.map((v) => (
                      <li key={v.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" title={v.manager}>
                            {getShortManagerName(v.manager)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            Cliente {v.client_code} · Vendedor {v.rca_accompanied}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {formatDateOnlyPtBR(v.visit_date)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </Layout>
  );
}

/* ===== Sub-components ===== */

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: any;
  label: string;
  value: number;
  loading: boolean;
  accent: "primary" | "secondary";
}) {
  return (
    <div className="glass-card rounded-xl p-4 relative overflow-hidden group hover:shadow-lg transition-all">
      <div
        className={`absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-20 blur-2xl ${
          accent === "primary" ? "bg-primary" : "bg-secondary"
        }`}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon
            className={`h-4 w-4 ${
              accent === "primary" ? "text-primary" : "text-secondary"
            }`}
          />
        </div>
        <p className="text-3xl font-bold tracking-tight">
          {loading ? "—" : value.toLocaleString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

function ActionCard({
  to,
  label,
  desc,
  icon: Icon,
  featured,
}: {
  to: string;
  label: string;
  desc: string;
  icon: any;
  featured?: boolean;
}) {
  return (
    <Link to={to} className="group block h-full">
      <div
        className={`glass-card rounded-xl p-5 h-full relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
          featured ? "ring-2 ring-primary/40" : ""
        }`}
      >
        {featured && (
          <div className="absolute inset-0 bg-hero-gradient opacity-10 pointer-events-none" />
        )}
        <div className="relative flex flex-col h-full">
          <div
            className={`inline-flex items-center justify-center h-11 w-11 rounded-lg mb-3 ${
              featured
                ? "bg-hero-gradient text-primary-foreground"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-sm md:text-base mb-1">{label}</h3>
          <p className="text-xs text-muted-foreground flex-1">{desc}</p>
          <div className="flex items-center text-xs text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            Acessar <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function FormTemplateCard({
  to,
  name,
  description,
  iconName,
  isSystem,
  slug,
}: {
  to: string;
  name: string;
  description: string;
  iconName: string;
  isSystem: boolean;
  slug: string;
}) {
  const IconComp = (Icons as any)[iconName] || Icons.FileText;
  const supplier = getSupplierForSlug(slug);
  return (
    <Link to={to} className="group block h-full">
      <div className="glass-card rounded-xl p-5 h-full relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="absolute inset-0 bg-hero-gradient opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity" />
        <div className="relative flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            {supplier.logo ? (
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-white shadow-sm border border-border/40 overflow-hidden p-2">
                <img
                  src={supplier.logo}
                  alt={`Logo ${supplier.name}`}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-hero-gradient text-primary-foreground">
                <IconComp className="h-7 w-7" />
              </div>
            )}
            {isSystem && (
              <Badge variant="secondary" className="text-[10px]">
                Padrão
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-base mb-1">{name}</h3>
          <p className="text-xs text-muted-foreground flex-1 line-clamp-2">
            {description || "Iniciar novo registro"}
          </p>
          <div className="flex items-center text-xs text-primary mt-3 font-medium">
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            Iniciar
            <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}