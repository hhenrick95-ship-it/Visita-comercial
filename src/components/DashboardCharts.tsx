import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Lightbulb } from "lucide-react";
import { normalizeManagerName, getShortManagerName, TeamMember } from "@/lib/normalizeManager";

interface VisitData {
  id: string;
  visit_date: string;
  manager: string;
  client_code?: string;
  relationship_level: number | null;
  execution_level: number | null;
  delivery_level: number | null;
  has_mix_expansion_opportunities: boolean;
  has_visibility_improvement_opportunities: boolean;
  mix_expansion_details?: string | null;
  visibility_improvement_details?: string | null;
  additional_comments?: string | null;
}

interface DashboardChartsProps {
  visits: VisitData[];
  highlightedVisit?: VisitData | null;
  teamMembers?: TeamMember[];
}

export const DashboardCharts = ({ visits, highlightedVisit, teamMembers = [] }: DashboardChartsProps) => {
  // Dados para gráfico de linha (visitas por dia últimos 30 dias)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split("T")[0];
  });

  const visitsPerDay = last30Days.map((date) => ({
    date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    fullDate: date,
    visitas: visits.filter((v) => v.visit_date === date).length,
    isHighlighted: highlightedVisit?.visit_date === date,
  }));

  // Dados para gráfico de barras (visitas por gestor) - normalizado e agrupado
  const visitsByManagerRaw = visits.reduce((acc, visit) => {
    const normalizedManager = normalizeManagerName(visit.manager, teamMembers);
    acc[normalizedManager] = (acc[normalizedManager] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const visitsByManager = Object.entries(visitsByManagerRaw).map(([name, count]) => ({ 
    name,
    shortName: getShortManagerName(name),
    visitas: count,
    isHighlighted: highlightedVisit ? normalizeManagerName(highlightedVisit.manager, teamMembers) === name : false
  }));
  // Dados para radar (médias dos níveis)
  const avgLevels = {
    relacionamento: visits.reduce((sum, v) => sum + (v.relationship_level || 0), 0) / visits.length || 0,
    execução: visits.reduce((sum, v) => sum + (v.execution_level || 0), 0) / visits.length || 0,
    entrega: visits.reduce((sum, v) => sum + (v.delivery_level || 0), 0) / visits.length || 0,
  };

  const radarData = [
    { subject: "Relacionamento", value: avgLevels.relacionamento, fullMark: 5 },
    { subject: "Execução", value: avgLevels.execução, fullMark: 5 },
    { subject: "Entrega", value: avgLevels.entrega, fullMark: 5 },
  ];

  // Dados para pizza (oportunidades)
  const opportunitiesData = [
    {
      name: "Expansão de Mix",
      value: visits.filter((v) => v.has_mix_expansion_opportunities).length,
      isHighlighted: highlightedVisit?.has_mix_expansion_opportunities || false,
    },
    {
      name: "Melhoria de Visibilidade",
      value: visits.filter((v) => v.has_visibility_improvement_opportunities).length,
      isHighlighted: highlightedVisit?.has_visibility_improvement_opportunities || false,
    },
    {
      name: "Sem Oportunidades",
      value: visits.filter(
        (v) => !v.has_mix_expansion_opportunities && !v.has_visibility_improvement_opportunities
      ).length,
      isHighlighted: highlightedVisit ? !highlightedVisit.has_mix_expansion_opportunities && !highlightedVisit.has_visibility_improvement_opportunities : false,
    },
  ];

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

  // Custom Tooltip Components
  const CustomLineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const fullDate = new Date(data.fullDate);
      const dayOfWeek = fullDate.toLocaleDateString("pt-BR", { weekday: "long" });
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-1 capitalize">{dayOfWeek}</p>
          <p className="text-xs text-muted-foreground mb-2">{data.date}</p>
          <p className="text-sm">
            <span className="font-bold text-primary">{data.visitas}</span> visita{data.visitas !== 1 ? 's' : ''} realizada{data.visitas !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalVisits = visits.length;
      const percentage = totalVisits > 0 ? ((data.visitas / totalVisits) * 100).toFixed(1) : 0;
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-xs">
          <p className="font-semibold text-sm mb-2 break-words">{data.name}</p>
          <p className="text-sm mb-1">
            <span className="font-bold text-primary">{data.visitas}</span> visita{data.visitas !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {percentage}% do total de visitas
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-1">{data.subject}</p>
          <p className="text-sm">
            Média: <span className="font-bold text-primary">{data.value.toFixed(2)}</span> / {data.fullMark}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {((data.value / data.fullMark) * 100).toFixed(0)}% de desempenho
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const totalVisits = visits.length;
      const percentage = totalVisits > 0 ? ((data.value / totalVisits) * 100).toFixed(1) : 0;
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.name}</p>
          <p className="text-sm mb-1">
            <span className="font-bold text-primary">{data.value}</span> visita{data.value !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {percentage}% do total ({totalVisits} visitas)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Linha */}
      <Card>
        <CardHeader>
          <CardTitle>Visitas por Dia (Últimos 30 Dias)</CardTitle>
          <CardDescription>Evolução diária de visitas realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visitsPerDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip content={<CustomLineTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="visitas"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={payload.isHighlighted ? 8 : 4}
                      fill={payload.isHighlighted ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                      stroke={payload.isHighlighted ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                      strokeWidth={payload.isHighlighted ? 3 : 1}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Barras - Com labels curtos */}
      <Card>
        <CardHeader>
          <CardTitle>Visitas por Gestor</CardTitle>
          <CardDescription>Comparativo de visitas realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={visitsByManager} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="shortName" 
                className="text-xs" 
                angle={-45} 
                textAnchor="end"
                interval={0}
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis className="text-xs" />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend />
              <Bar 
                dataKey="visitas" 
                radius={[8, 8, 0, 0]}
                fill="hsl(var(--primary))"
              >
                {visitsByManager.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isHighlighted ? "hsl(var(--destructive))" : "hsl(var(--primary))"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico Radar */}
      <Card>
        <CardHeader>
          <CardTitle>Médias de Avaliação (1-5)</CardTitle>
          <CardDescription>Níveis de relacionamento, execução e entrega</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" className="text-xs" />
              <PolarRadiusAxis angle={90} domain={[0, 5]} className="text-xs" />
              <Radar
                name="Média"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
              <Tooltip content={<CustomRadarTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Pizza - Oportunidades (versão simplificada) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Distribuição de Oportunidades
          </CardTitle>
          <CardDescription>Resumo visual das oportunidades identificadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={opportunitiesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {opportunitiesData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    opacity={entry.isHighlighted ? 1 : 0.7}
                    stroke={entry.isHighlighted ? "hsl(var(--destructive))" : "none"}
                    strokeWidth={entry.isHighlighted ? 3 : 0}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};