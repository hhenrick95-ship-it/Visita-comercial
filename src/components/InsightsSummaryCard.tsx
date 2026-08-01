import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  MessageSquare,
  BarChart3,
  Users,
  Package,
  Lightbulb
} from 'lucide-react';

interface InsightsSummaryCardProps {
  summary: string;
}

interface ParsedSection {
  title: string;
  icon: React.ReactNode;
  items: string[];
  type: 'metrics' | 'analysis' | 'alerts' | 'opportunities' | 'general';
}

// Detecta métricas numéricas no texto
function extractMetrics(text: string): { value: string; label: string }[] {
  const metrics: { value: string; label: string }[] = [];
  const seen = new Set<string>();
  
  // Padrões com labels descritivos e contextuais
  const patterns: { regex: RegExp; labelFn: (match: RegExpMatchArray) => string }[] = [
    { 
      regex: /total\s*de\s*(\d+)\s*(visitas?|feedbacks?|gestores?|rcas?|clientes?)/gi,
      labelFn: (m) => `Total de ${m[2]}`
    },
    { 
      regex: /(\d+)\s*visitas?\s*(realizadas?|registradas?|no período|por dia|diárias?)/gi,
      labelFn: (m) => `Visitas ${m[2]}`
    },
    {
      regex: /média\s*(?:geral\s*)?(?:de\s*)?(\d+[,.]?\d*)\s*(visitas?[^.]*?(?:por|\/)\s*\w+|pontos?|%)?/gi,
      labelFn: (m) => `Média ${m[2] || 'geral'}`
    },
    {
      regex: /(\d+)\s*gestores?\s*(ativos?|participantes?)?/gi,
      labelFn: (m) => `Gestores ${m[2] || 'ativos'}`
    },
    {
      regex: /(\d+)\s*rcas?\s*(acompanhados?|visitados?|cobertos?)?/gi,
      labelFn: (m) => `RCAs ${m[2] || 'acompanhados'}`
    },
    {
      regex: /(\d+)\s*clientes?\s*(visitados?|atendidos?|únicos?)?/gi,
      labelFn: (m) => `Clientes ${m[2] || 'visitados'}`
    },
    {
      regex: /(\d+[,.]?\d*)\s*%\s*(?:de\s*)?([^.,\n]{3,30})/gi,
      labelFn: (m) => m[2].trim()
    },
    {
      regex: /(\d+)\s*feedbacks?\s*(realizados?|registrados?|dados?)?/gi,
      labelFn: (m) => `Feedbacks ${m[2] || 'dados'}`
    },
  ];
  
  for (const { regex, labelFn } of patterns) {
    const matches = text.matchAll(regex);
    for (const match of matches) {
      const value = match[1];
      const label = labelFn(match).replace(/\s+/g, ' ').trim();
      const key = `${value}-${label.toLowerCase()}`;
      if (!seen.has(key) && value && label) {
        seen.add(key);
        metrics.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      }
    }
    if (metrics.length >= 4) break;
  }
  
  return metrics.slice(0, 4);
}

// Parse o markdown em seções estruturadas
function parseSummary(summary: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = summary.split('\n').filter(line => line.trim());
  
  let currentSection: ParsedSection | null = null;
  
  const getSectionInfo = (title: string): { icon: React.ReactNode; type: ParsedSection['type'] } => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('métrica') || lowerTitle.includes('resumo geral')) {
      return { icon: <BarChart3 className="h-4 w-4" />, type: 'metrics' };
    }
    if (lowerTitle.includes('comentário') || lowerTitle.includes('observaç')) {
      return { icon: <MessageSquare className="h-4 w-4" />, type: 'analysis' };
    }
    if (lowerTitle.includes('alerta') || lowerTitle.includes('atenção') || lowerTitle.includes('principal')) {
      return { icon: <AlertTriangle className="h-4 w-4" />, type: 'alerts' };
    }
    if (lowerTitle.includes('oportunidade')) {
      return { icon: <Lightbulb className="h-4 w-4" />, type: 'opportunities' };
    }
    if (lowerTitle.includes('desempenho') || lowerTitle.includes('performance')) {
      return { icon: <Target className="h-4 w-4" />, type: 'metrics' };
    }
    if (lowerTitle.includes('equipe') || lowerTitle.includes('gestor')) {
      return { icon: <Users className="h-4 w-4" />, type: 'analysis' };
    }
    if (lowerTitle.includes('produto') || lowerTitle.includes('mix')) {
      return { icon: <Package className="h-4 w-4" />, type: 'opportunities' };
    }
    
    return { icon: <CheckCircle2 className="h-4 w-4" />, type: 'general' };
  };
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Detecta títulos de seção (começam com ** ou são linhas em maiúscula/capitalizadas seguidas de texto)
    const headerMatch = trimmedLine.match(/^\*\*(.+?)\*\*$/) || 
                        trimmedLine.match(/^#+\s*(.+)$/) ||
                        trimmedLine.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]+)$/);
    
    if (headerMatch || (trimmedLine.length < 60 && !trimmedLine.includes('.') && trimmedLine.endsWith(':'))) {
      // Salvar seção anterior se existir
      if (currentSection && currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      
      const title = headerMatch ? headerMatch[1].replace(/[*#:]/g, '').trim() : trimmedLine.replace(':', '');
      const { icon, type } = getSectionInfo(title);
      
      currentSection = {
        title,
        icon,
        items: [],
        type
      };
    } else if (trimmedLine.length > 0) {
      // É um item de conteúdo
      if (currentSection) {
        // Limpar formatação markdown e adicionar
        const cleanedLine = trimmedLine
          .replace(/^\*+\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/^\-\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .trim();
        
        if (cleanedLine.length > 0) {
          currentSection.items.push(cleanedLine);
        }
      } else {
        // Criar seção inicial se não houver título
        currentSection = {
          title: 'Análise Executiva',
          icon: <BarChart3 className="h-4 w-4" />,
          items: [trimmedLine.replace(/\*\*/g, '').replace(/^\-\s*/, '').trim()],
          type: 'general'
        };
      }
    }
  }
  
  // Adicionar última seção
  if (currentSection && currentSection.items.length > 0) {
    sections.push(currentSection);
  }
  
  return sections;
}

// Extrai destaques importantes do texto
function extractHighlights(text: string): string[] {
  const highlights: string[] = [];
  
  // Procurar padrões de destaque
  const highlightPatterns = [
    /(?:alta taxa|boa|excelente|positiv[ao])[^.]*\./gi,
    /(?:principal|importante|destaque)[^.]*\./gi,
  ];
  
  highlightPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      highlights.push(...matches.slice(0, 2));
    }
  });
  
  return highlights.slice(0, 3);
}

function getSectionBgColor(type: ParsedSection['type']): string {
  switch (type) {
    case 'metrics': return 'bg-primary/5 border-primary/20';
    case 'alerts': return 'bg-destructive/5 border-destructive/20';
    case 'opportunities': return 'bg-chart-2/10 border-chart-2/30';
    case 'analysis': return 'bg-muted/50 border-muted-foreground/20';
    default: return 'bg-card border-border';
  }
}

function getSectionIconColor(type: ParsedSection['type']): string {
  switch (type) {
    case 'metrics': return 'text-primary';
    case 'alerts': return 'text-destructive';
    case 'opportunities': return 'text-chart-2';
    case 'analysis': return 'text-muted-foreground';
    default: return 'text-foreground';
  }
}

export function InsightsSummaryCard({ summary }: InsightsSummaryCardProps) {
  const sections = parseSummary(summary);
  const metrics = extractMetrics(summary);
  
  // Se não conseguiu parsear em seções, mostrar as métricas principais + texto resumido
  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {summary.slice(0, 500)}
            {summary.length > 500 && '...'}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Métricas em destaque */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((metric, index) => (
            <Card key={index} className="border-primary/20 bg-primary/5">
              <CardContent className="py-3 px-4">
                <p className="text-2xl font-bold text-primary">{metric.value}</p>
                <p className="text-xs text-muted-foreground capitalize">{metric.label || 'Métrica'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Seções estruturadas */}
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((section, index) => (
          <Card 
            key={index} 
            className={`${getSectionBgColor(section.type)} transition-colors`}
          >
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={getSectionIconColor(section.type)}>
                  {section.icon}
                </div>
                <h4 className="font-semibold text-sm">{section.title}</h4>
                {section.type === 'alerts' && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    Atenção
                  </Badge>
                )}
              </div>
              <ul className="space-y-1.5">
                {section.items.slice(0, 4).map((item, itemIndex) => (
                  <li key={itemIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1.5 shrink-0">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
                {section.items.length > 4 && (
                  <li className="text-xs text-muted-foreground italic">
                    +{section.items.length - 4} itens...
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
