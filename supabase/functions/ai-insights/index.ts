import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função separada para análise de feedbacks
async function handleFeedbackAnalysis(
  supabase: any, 
  filters: any, 
  geminiApiKey: string, 
  corsHeaders: Record<string, string>
) {
  // Buscar feedbacks
  let feedbackQuery = supabase.from('feedbacks').select('*');

  if (filters?.startDate) {
    feedbackQuery = feedbackQuery.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    feedbackQuery = feedbackQuery.lte('created_at', filters.endDate + 'T23:59:59');
  }
  if (filters?.manager) {
    feedbackQuery = feedbackQuery.eq('supervisor', filters.manager);
  }
  if (filters?.rca) {
    feedbackQuery = feedbackQuery.eq('vendor_code', filters.rca);
  }

  const { data: feedbacks, error: feedbackError } = await feedbackQuery.order('created_at', { ascending: false });

  if (feedbackError) throw feedbackError;

  console.log(`Feedbacks carregados: ${feedbacks?.length || 0}`);

  // Agregar por supervisor
  const supervisorStats = feedbacks?.reduce((acc: any, fb: any) => {
    const supervisor = fb.supervisor;
    if (!acc[supervisor]) {
      acc[supervisor] = {
        supervisor,
        totalFeedbacks: 0,
        vendorsCovered: new Set(),
        criticismPatterns: [] as string[],
        actionPlanPatterns: [] as string[]
      };
    }
    acc[supervisor].totalFeedbacks++;
    acc[supervisor].vendorsCovered.add(fb.vendor_code);
    if (fb.constructive_criticism) {
      acc[supervisor].criticismPatterns.push(fb.constructive_criticism.substring(0, 200));
    }
    if (fb.action_plan) {
      acc[supervisor].actionPlanPatterns.push(fb.action_plan.substring(0, 200));
    }
    return acc;
  }, {});

  // Converter Sets
  Object.values(supervisorStats || {}).forEach((stat: any) => {
    stat.vendorsCount = stat.vendorsCovered.size;
    delete stat.vendorsCovered;
  });

  // Agregar por vendedor
  const vendorStats = feedbacks?.reduce((acc: any, fb: any) => {
    const vendor = fb.vendor_code;
    if (!acc[vendor]) {
      acc[vendor] = {
        vendor,
        totalFeedbacks: 0,
        supervisors: new Set(),
        recentCriticisms: [] as string[],
        recentActionPlans: [] as string[]
      };
    }
    acc[vendor].totalFeedbacks++;
    acc[vendor].supervisors.add(fb.supervisor);
    if (fb.constructive_criticism) {
      acc[vendor].recentCriticisms.push(fb.constructive_criticism.substring(0, 200));
    }
    if (fb.action_plan) {
      acc[vendor].recentActionPlans.push(fb.action_plan.substring(0, 200));
    }
    return acc;
  }, {});

  // Converter Sets
  Object.values(vendorStats || {}).forEach((stat: any) => {
    stat.supervisorsCount = stat.supervisors.size;
    delete stat.supervisors;
    // Limitar a 3 exemplos cada
    stat.recentCriticisms = stat.recentCriticisms.slice(0, 3);
    stat.recentActionPlans = stat.recentActionPlans.slice(0, 3);
  });

  const contextData = {
    totalFeedbacks: feedbacks?.length || 0,
    period: `${filters?.startDate || 'início'} até ${filters?.endDate || 'hoje'}`,
    supervisors: Object.values(supervisorStats || {}).sort((a: any, b: any) => b.totalFeedbacks - a.totalFeedbacks),
    vendors: Object.values(vendorStats || {}).sort((a: any, b: any) => b.totalFeedbacks - a.totalFeedbacks).slice(0, 20),
    sampleFeedbacks: feedbacks?.slice(0, 15).map((fb: any) => ({
      supervisor: fb.supervisor,
      vendor: fb.vendor_code,
      criticism: fb.constructive_criticism?.substring(0, 300),
      actionPlan: fb.action_plan?.substring(0, 300),
      date: fb.created_at?.split('T')[0]
    }))
  };

  const systemPrompt = `Você é um analista especializado em gestão de equipes de vendas.

CONTEXTO DOS FEEDBACKS:
${JSON.stringify(contextData, null, 2)}

IMPORTANTE:
- Feedbacks são dados pelos Supervisores/Coordenadores aos RCAs (vendedores)
- Cada feedback contém: crítica construtiva e plano de ação
- Analise padrões nas críticas e planos de ação
- Identifique vendedores que recebem mais feedbacks
- Identifique supervisores mais ativos

FOCO DA ANÁLISE:
- Padrões recorrentes nas críticas construtivas
- Qualidade dos planos de ação propostos
- Vendedores que precisam de mais atenção
- Supervisores com maior engajamento

Responda em português brasileiro. Seja objetivo e acionável.`;

  const userPrompt = `Analise os feedbacks dados aos vendedores:
- Padrões nas críticas construtivas (problemas recorrentes)
- Qualidade e efetividade dos planos de ação
- Vendedores que receberam mais feedbacks (positivo ou negativo?)
- Supervisores mais engajados no processo de feedback
- Recomendações para melhorar o processo de feedback`;

  const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${geminiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'return_insights',
          description: 'Retorna insights estruturados sobre os feedbacks dados aos vendedores',
          parameters: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: 'Resumo executivo em markdown sobre os feedbacks'
              },
              alerts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    relatedVendor: { type: 'string' },
                    metric: { type: 'string' }
                  },
                  required: ['severity', 'title', 'description']
                }
              },
              opportunities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                    clientCode: { type: 'string' }
                  },
                  required: ['title', 'description', 'impact']
                }
              },
              topPerformers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    metric: { type: 'string' },
                    value: { type: 'string' },
                    reason: { type: 'string' }
                  },
                  required: ['name', 'metric', 'value']
                }
              },
              bottomPerformers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    metric: { type: 'string' },
                    value: { type: 'string' },
                    reason: { type: 'string' }
                  },
                  required: ['name', 'metric', 'value']
                }
              },
              recommendations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    action: { type: 'string' },
                    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                    description: { type: 'string' }
                  },
                  required: ['action', 'priority']
                }
              }
            },
            required: ['summary', 'alerts', 'opportunities', 'recommendations']
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'return_insights' } }
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns instantes.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiResponse.status === 403) {
      return new Response(JSON.stringify({ error: 'Chave API do Gemini inválida ou sem permissão.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const errorText = await aiResponse.text();
    console.error('AI gateway error:', aiResponse.status, errorText);
    throw new Error('Erro ao chamar AI gateway');
  }

  const aiData = await aiResponse.json();
  console.log('AI response for feedbacks:', JSON.stringify(aiData, null, 2));

  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error('Resposta da IA não contém tool_call esperado');
  }

  const insights = JSON.parse(toolCall.function.arguments);

  return new Response(JSON.stringify(insights), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =============================================================
// Análise genérica para qualquer template novo (form_submissions)
// =============================================================
async function handleGenericTemplateAnalysis(
  supabase: any,
  templateId: string,
  filters: any,
  geminiApiKey: string,
  corsHeaders: Record<string, string>,
) {
  // Carregar metadata do template
  const { data: template, error: tplErr } = await supabase
    .from('form_templates')
    .select('id, name, description, slug, ai_analysis_config')
    .eq('id', templateId)
    .maybeSingle();

  if (tplErr || !template) {
    return new Response(JSON.stringify({ error: 'Template não encontrado.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Carregar submissões com filtros básicos
  let q = supabase.from('form_submissions').select('*').eq('template_id', templateId);
  if (filters?.startDate) q = q.gte('submitted_at', filters.startDate);
  if (filters?.endDate) q = q.lte('submitted_at', filters.endDate + 'T23:59:59');
  const { data: submissions, error: subErr } = await q.order('submitted_at', { ascending: false }).limit(500);
  if (subErr) throw subErr;

  console.log(`[Generic AI] Template "${template.name}" — ${submissions?.length || 0} submissões`);

  // Carregar respostas (até 5k linhas para evitar payload gigante)
  const ids = (submissions || []).map((s: any) => s.id);
  let responses: any[] = [];
  if (ids.length > 0) {
    const { data: resp } = await supabase
      .from('form_responses')
      .select('submission_id, response_value, form_questions!inner(label, question_type, identification_role, metric_category)')
      .in('submission_id', ids)
      .limit(5000);
    responses = resp || [];
  }

  // Agrupar respostas por submissão
  const byId: Record<string, any[]> = {};
  responses.forEach((r: any) => {
    if (!byId[r.submission_id]) byId[r.submission_id] = [];
    byId[r.submission_id].push({
      label: r.form_questions?.label,
      type: r.form_questions?.question_type,
      role: r.form_questions?.identification_role,
      value: r.response_value,
    });
  });

  // Estatísticas básicas
  const totalSubmissions = submissions?.length || 0;
  const sample = (submissions || []).slice(0, 30).map((s: any) => ({
    submitted_at: s.submitted_at?.split('T')[0],
    metadata: s.metadata,
    address: s.address,
    answers: (byId[s.id] || []).slice(0, 30),
  }));

  // Identificações agregadas (manager, vendor, client, etc) usando identification_role
  const idAgg: Record<string, Record<string, number>> = {};
  responses.forEach((r: any) => {
    const role = r.form_questions?.identification_role;
    if (!role) return;
    const v = String(r.response_value ?? '').trim();
    if (!v) return;
    if (!idAgg[role]) idAgg[role] = {};
    idAgg[role][v] = (idAgg[role][v] || 0) + 1;
  });

  const contextData = {
    template: { name: template.name, description: template.description, slug: template.slug },
    period: `${filters?.startDate || 'início'} até ${filters?.endDate || 'hoje'}`,
    totalSubmissions,
    aggregatedIdentifications: idAgg,
    sampleSubmissions: sample,
  };

  const systemPrompt = `Você é um analista especializado em formulários de campo.

TEMPLATE: ${template.name}
DESCRIÇÃO: ${template.description || 'Não informada'}

CONTEXTO DOS DADOS:
${JSON.stringify(contextData, null, 2)}

IMPORTANTE:
- Este NÃO é o formulário tradicional de visitas — é um formulário customizado.
- Use o campo "aggregatedIdentifications" para descobrir quem (gestor/vendedor/cliente) aparece com mais frequência, baseado nos papéis (identification_role) configurados pelo administrador.
- Use "sampleSubmissions.answers" para entender o teor das respostas.
- Foque em padrões reais nos dados; não invente métricas que não existem.
- Responda em português brasileiro, de forma objetiva e acionável.`;

  const userPrompt = `Forneça uma análise executiva dos registros do formulário "${template.name}":
1. Resumo executivo dos principais achados.
2. Alertas (problemas ou inconsistências) identificados nas respostas.
3. Oportunidades de melhoria detectadas no padrão dos preenchimentos.
4. Top performers e bottom performers (com base nos papéis identificados, se houver).
5. Recomendações práticas para a equipe.`;

  const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${geminiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'return_insights',
          description: 'Retorna insights estruturados sobre as submissões do template.',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              alerts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    relatedVendor: { type: 'string' },
                    metric: { type: 'string' },
                  },
                  required: ['severity', 'title', 'description'],
                },
              },
              opportunities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                    clientCode: { type: 'string' },
                  },
                  required: ['title', 'description', 'impact'],
                },
              },
              topPerformers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    metric: { type: 'string' },
                    value: { type: 'string' },
                    reason: { type: 'string' },
                  },
                  required: ['name', 'metric', 'value'],
                },
              },
              bottomPerformers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    metric: { type: 'string' },
                    value: { type: 'string' },
                    reason: { type: 'string' },
                  },
                  required: ['name', 'metric', 'value'],
                },
              },
              recommendations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    action: { type: 'string' },
                    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                    description: { type: 'string' },
                  },
                  required: ['action', 'priority'],
                },
              },
            },
            required: ['summary', 'alerts', 'opportunities', 'recommendations'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'return_insights' } },
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit excedido.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiResponse.status === 403) {
      return new Response(JSON.stringify({ error: 'Chave API inválida.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const errorText = await aiResponse.text();
    console.error('Generic AI gateway error:', aiResponse.status, errorText);
    throw new Error('Erro ao chamar AI gateway');
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error('Resposta da IA não contém tool_call esperado');
  const insights = JSON.parse(toolCall.function.arguments);
  return new Response(JSON.stringify(insights), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autenticação não fornecido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user token and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has approved role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Usuário não aprovado para acessar insights' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`AI Insights - User: ${user.email}, Role: ${roleData.role}`);

    const { filters, analysisType = 'general' } = await req.json();
    
    // Para análise de feedbacks, usar lógica diferente
    if (analysisType === 'feedback_analysis') {
      return await handleFeedbackAnalysis(supabase, filters, geminiApiKey, corsHeaders);
    }

    // Se um templateId foi fornecido, usar análise genérica baseada em form_submissions
    if (filters?.templateId) {
      return await handleGenericTemplateAnalysis(supabase, filters.templateId, filters, geminiApiKey, corsHeaders);
    }

    // Função para validar e corrigir datas inválidas (ex: 2026-02-31 -> 2026-02-28)
    const validateAndFixDate = (dateStr: string): string => {
      if (!dateStr) return dateStr;
      
      // Tentar parsear a data
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
      
      // Criar data e deixar o JavaScript ajustar automaticamente
      // Se dia for inválido (ex: 31 de fevereiro), ajusta para o último dia válido
      const date = new Date(year, month - 1, day);
      
      // Verificar se a data foi ajustada (overflow de dia)
      if (date.getMonth() !== month - 1) {
        // Dia inválido - usar último dia do mês original
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        return `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      }
      
      return dateStr;
    };

    // Validar datas dos filtros
    if (filters?.startDate) {
      filters.startDate = validateAndFixDate(filters.startDate);
    }
    if (filters?.endDate) {
      filters.endDate = validateAndFixDate(filters.endDate);
    }

    // Calcular período anterior para análise comparativa
    const getPreviousPeriod = (startDate: string, endDate: string) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - periodDays);
      
      return {
        startDate: prevStart.toISOString().split('T')[0],
        endDate: prevEnd.toISOString().split('T')[0]
      };
    };

    // Buscar dados filtrados do período atual (somente visitas, sem feedbacks)
    let visitQuery = supabase.from('visit_forms').select('*');

    if (filters?.startDate) {
      visitQuery = visitQuery.gte('visit_date', filters.startDate);
    }
    if (filters?.endDate) {
      visitQuery = visitQuery.lte('visit_date', filters.endDate);
    }
    if (filters?.manager) {
      visitQuery = visitQuery.eq('manager', filters.manager);
    }
    if (filters?.rca) {
      visitQuery = visitQuery.eq('rca_accompanied', filters.rca);
    }
    if (filters?.clientCode) {
      visitQuery = visitQuery.eq('client_code', filters.clientCode);
    }

    // Filtros avançados
    if (filters?.team) {
      const { data: teamVendors } = await supabase
        .from('teams_vendors')
        .select('cod_rca_lopes')
        .eq('cod_equipe', filters.team);
      
      if (teamVendors && teamVendors.length > 0) {
        const vendorCodes = teamVendors.map(tv => tv.cod_rca_lopes);
        visitQuery = visitQuery.in('rca_accompanied', vendorCodes);
      }
    }

    if (filters?.region) {
      visitQuery = visitQuery.ilike('address', `%${filters.region}%`);
    }

    if (filters?.clientType && filters.clientType !== 'all') {
      if (filters.clientType === 'high_value') {
        visitQuery = visitQuery.gte('client_code', '1000');
      } else if (filters.clientType === 'medium_value') {
        visitQuery = visitQuery.gte('client_code', '500').lt('client_code', '1000');
      } else if (filters.clientType === 'low_value') {
        visitQuery = visitQuery.lt('client_code', '500');
      }
    }

    const { data: visits, error: visitError } = await visitQuery;

    if (visitError) throw visitError;

    console.log(`Dados carregados: ${visits?.length || 0} visitas`);

    // Buscar respostas do formulário para todas as visitas
    const visitIds = visits?.map(v => v.id) || [];
    
    let formResponses: any[] = [];
    if (visitIds.length > 0) {
      const { data: responses, error: responsesError } = await supabase
        .from('form_responses')
        .select(`
          visit_form_id,
          response_value,
          question_id,
          form_questions!inner (
            label,
            question_type
          )
        `)
        .in('visit_form_id', visitIds);
      
      if (responsesError) {
        console.error('Erro ao buscar respostas:', responsesError);
      } else {
        formResponses = responses || [];
      }
    }

    // Organizar respostas por visita
    const responsesByVisit: Record<string, any[]> = {};
    formResponses.forEach((r: any) => {
      if (!responsesByVisit[r.visit_form_id]) {
        responsesByVisit[r.visit_form_id] = [];
      }
      responsesByVisit[r.visit_form_id].push({
        label: r.form_questions?.label,
        type: r.form_questions?.question_type,
        value: r.response_value
      });
    });

    // Extrair comentários e observações de todas as visitas
    const allComments: { visitId: string; manager: string; rca: string; client: string; date: string; comments: any[] }[] = [];
    
    visits?.forEach(visit => {
      const visitResponses = responsesByVisit[visit.id] || [];
      const textResponses = visitResponses.filter((r: any) => 
        (r.type === 'textarea' || r.type === 'text') && 
        r.value && 
        typeof r.value === 'string' && 
        r.value.trim().length > 0
      );
      
      if (textResponses.length > 0 || visit.additional_comments || visit.ruptures_description || visit.vendor_observations) {
        const comments: any[] = textResponses.map((r: any) => ({
          campo: r.label,
          valor: r.value
        }));
        
        // Adicionar campos legados se existirem
        if (visit.additional_comments) comments.push({ campo: 'Comentários Adicionais', valor: visit.additional_comments });
        if (visit.ruptures_description) comments.push({ campo: 'Descrição de Rupturas', valor: visit.ruptures_description });
        if (visit.vendor_observations) comments.push({ campo: 'Observações do Vendedor', valor: visit.vendor_observations });
        if (visit.mix_expansion_details) comments.push({ campo: 'Detalhes Expansão Mix', valor: visit.mix_expansion_details });
        if (visit.visibility_improvement_details) comments.push({ campo: 'Detalhes Melhoria Visibilidade', valor: visit.visibility_improvement_details });
        
        allComments.push({
          visitId: visit.id,
          manager: visit.manager,
          rca: visit.rca_accompanied,
          client: visit.client_code,
          date: visit.visit_date,
          comments
        });
      }
    });

    // Para análise comparativa, buscar dados do período anterior
    let previousData = null;
    if (analysisType === 'comparative' && filters?.startDate && filters?.endDate) {
      const prevPeriod = getPreviousPeriod(filters.startDate, filters.endDate);
      
      let prevVisitQuery = supabase.from('visit_forms').select('*')
        .gte('visit_date', prevPeriod.startDate)
        .lte('visit_date', prevPeriod.endDate);

      if (filters?.manager) {
        prevVisitQuery = prevVisitQuery.eq('manager', filters.manager);
      }
      if (filters?.rca) {
        prevVisitQuery = prevVisitQuery.eq('rca_accompanied', filters.rca);
      }
      if (filters?.clientCode) {
        prevVisitQuery = prevVisitQuery.eq('client_code', filters.clientCode);
      }

      const { data: prevVisits } = await prevVisitQuery;

      previousData = {
        visits: prevVisits || [],
        period: prevPeriod
      };

      console.log(`Período anterior: ${prevVisits?.length || 0} visitas`);
    }

    // Calcular métricas agregadas
    const totalVisits = visits?.length || 0;
    const avgRelationship = visits?.reduce((sum, v) => sum + (v.relationship_level || 0), 0) / (totalVisits || 1);
    const avgExecution = visits?.reduce((sum, v) => sum + (v.execution_level || 0), 0) / (totalVisits || 1);
    const avgDelivery = visits?.reduce((sum, v) => sum + (v.delivery_level || 0), 0) / (totalVisits || 1);
    
    const visitsWithOpportunities = visits?.filter(v => 
      v.has_mix_expansion_opportunities || v.has_visibility_improvement_opportunities
    ).length || 0;

    const visitsWithProblems = visits?.filter(v => 
      !v.adequate_assortment_available || !v.prices_visible_correct || v.ruptures_description
    ).length || 0;

    // Agrupar por GESTOR (quem preenche o formulário)
    const managerStats = visits?.reduce((acc: any, visit) => {
      const manager = visit.manager;
      if (!acc[manager]) {
        acc[manager] = {
          manager,
          visits: 0,
          uniqueRCAs: new Set(),
          uniqueClients: new Set(),
          relationshipSum: 0,
          executionSum: 0,
          deliverySum: 0,
          opportunities: 0,
          problems: 0,
          rupturesCount: 0,
          commentsCount: 0
        };
      }
      acc[manager].visits++;
      acc[manager].uniqueRCAs.add(visit.rca_accompanied);
      acc[manager].uniqueClients.add(visit.client_code);
      acc[manager].relationshipSum += visit.relationship_level || 0;
      acc[manager].executionSum += visit.execution_level || 0;
      acc[manager].deliverySum += visit.delivery_level || 0;
      if (visit.has_mix_expansion_opportunities || visit.has_visibility_improvement_opportunities) {
        acc[manager].opportunities++;
      }
      if (!visit.adequate_assortment_available || !visit.prices_visible_correct || visit.ruptures_description) {
        acc[manager].problems++;
      }
      if (visit.ruptures_description) {
        acc[manager].rupturesCount++;
      }
      const visitComments = allComments.find(c => c.visitId === visit.id);
      if (visitComments) {
        acc[manager].commentsCount += visitComments.comments.length;
      }
      return acc;
    }, {});

    // Calcular médias e converter Sets para contagens
    Object.values(managerStats || {}).forEach((stat: any) => {
      stat.avgRelationship = stat.relationshipSum / stat.visits;
      stat.avgExecution = stat.executionSum / stat.visits;
      stat.avgDelivery = stat.deliverySum / stat.visits;
      stat.avgTotal = (stat.avgRelationship + stat.avgExecution + stat.avgDelivery) / 3;
      stat.rcaCoverage = stat.uniqueRCAs.size;
      stat.clientsCovered = stat.uniqueClients.size;
      delete stat.uniqueRCAs;
      delete stat.uniqueClients;
      delete stat.relationshipSum;
      delete stat.executionSum;
      delete stat.deliverySum;
    });

    // Agrupar por CLIENTE (PDV)
    const clientStats = visits?.reduce((acc: any, visit) => {
      const client = visit.client_code;
      if (!acc[client]) {
        acc[client] = {
          client,
          visits: 0,
          managers: new Set(),
          rcas: new Set(),
          relationshipSum: 0,
          executionSum: 0,
          deliverySum: 0,
          opportunities: 0,
          problems: 0,
          rupturesCount: 0,
          ruptureDetails: [] as string[]
        };
      }
      acc[client].visits++;
      acc[client].managers.add(visit.manager);
      acc[client].rcas.add(visit.rca_accompanied);
      acc[client].relationshipSum += visit.relationship_level || 0;
      acc[client].executionSum += visit.execution_level || 0;
      acc[client].deliverySum += visit.delivery_level || 0;
      if (visit.has_mix_expansion_opportunities || visit.has_visibility_improvement_opportunities) {
        acc[client].opportunities++;
      }
      if (!visit.adequate_assortment_available || !visit.prices_visible_correct || visit.ruptures_description) {
        acc[client].problems++;
      }
      if (visit.ruptures_description) {
        acc[client].rupturesCount++;
        acc[client].ruptureDetails.push(visit.ruptures_description);
      }
      return acc;
    }, {});

    // Calcular médias por cliente e converter Sets
    Object.values(clientStats || {}).forEach((stat: any) => {
      stat.avgRelationship = stat.relationshipSum / stat.visits;
      stat.avgExecution = stat.executionSum / stat.visits;
      stat.avgDelivery = stat.deliverySum / stat.visits;
      stat.avgTotal = (stat.avgRelationship + stat.avgExecution + stat.avgDelivery) / 3;
      stat.managersCount = stat.managers.size;
      stat.rcasCount = stat.rcas.size;
      delete stat.managers;
      delete stat.rcas;
      delete stat.relationshipSum;
      delete stat.executionSum;
      delete stat.deliverySum;
    });

    // Agrupar por RCA (cobertura de acompanhamento)
    const rcaCoverage = visits?.reduce((acc: any, visit) => {
      const rca = visit.rca_accompanied;
      if (!acc[rca]) {
        acc[rca] = {
          rca,
          accompaniments: 0,
          managers: new Set(),
          clients: new Set(),
          relationshipSum: 0,
          executionSum: 0,
          deliverySum: 0,
          opportunities: 0,
          problems: 0
        };
      }
      acc[rca].accompaniments++;
      acc[rca].managers.add(visit.manager);
      acc[rca].clients.add(visit.client_code);
      acc[rca].relationshipSum += visit.relationship_level || 0;
      acc[rca].executionSum += visit.execution_level || 0;
      acc[rca].deliverySum += visit.delivery_level || 0;
      if (visit.has_mix_expansion_opportunities || visit.has_visibility_improvement_opportunities) {
        acc[rca].opportunities++;
      }
      if (!visit.adequate_assortment_available || !visit.prices_visible_correct || visit.ruptures_description) {
        acc[rca].problems++;
      }
      return acc;
    }, {});

    // Calcular médias por RCA
    Object.values(rcaCoverage || {}).forEach((stat: any) => {
      stat.avgRelationship = stat.relationshipSum / stat.accompaniments;
      stat.avgExecution = stat.executionSum / stat.accompaniments;
      stat.avgDelivery = stat.deliverySum / stat.accompaniments;
      stat.avgTotal = (stat.avgRelationship + stat.avgExecution + stat.avgDelivery) / 3;
      stat.managersCount = stat.managers.size;
      stat.clientsCovered = stat.clients.size;
      delete stat.managers;
      delete stat.clients;
      delete stat.relationshipSum;
      delete stat.executionSum;
      delete stat.deliverySum;
    });

    // Preparar dados do período anterior se existir
    let previousPeriodStats = null;
    if (previousData) {
      const prevTotalVisits = previousData.visits.length;
      const prevAvgRelationship = previousData.visits.reduce((sum: number, v: any) => sum + (v.relationship_level || 0), 0) / (prevTotalVisits || 1);
      const prevAvgExecution = previousData.visits.reduce((sum: number, v: any) => sum + (v.execution_level || 0), 0) / (prevTotalVisits || 1);
      const prevAvgDelivery = previousData.visits.reduce((sum: number, v: any) => sum + (v.delivery_level || 0), 0) / (prevTotalVisits || 1);

      previousPeriodStats = {
        totalVisits: prevTotalVisits,
        avgLevels: {
          relationship: prevAvgRelationship.toFixed(2),
          execution: prevAvgExecution.toFixed(2),
          delivery: prevAvgDelivery.toFixed(2)
        },
        period: `${previousData.period.startDate} até ${previousData.period.endDate}`
      };
    }

    // Preparar contexto para a IA
    const contextData = {
      currentPeriod: {
        totalVisits,
        period: `${filters?.startDate || 'início'} até ${filters?.endDate || 'hoje'}`,
        avgLevels: {
          relationship: avgRelationship.toFixed(2),
          execution: avgExecution.toFixed(2),
          delivery: avgDelivery.toFixed(2)
        },
        visitsWithOpportunities,
        visitsWithProblems,
        totalComments: allComments.reduce((sum, c) => sum + c.comments.length, 0)
      },
      previousPeriod: previousPeriodStats,
      managers: Object.values(managerStats || {}).sort((a: any, b: any) => b.visits - a.visits),
      clients: Object.values(clientStats || {}).sort((a: any, b: any) => b.visits - a.visits).slice(0, 30),
      rcaCoverage: Object.values(rcaCoverage || {}).sort((a: any, b: any) => b.accompaniments - a.accompaniments),
      formComments: allComments.slice(0, 50)
    };

    const systemPrompt = `Você é um analista especializado em operações de vendas e distribuição.

CONTEXTO DOS DADOS DO FORMULÁRIO DE VISITAS:
${JSON.stringify(contextData, null, 2)}

IMPORTANTE - ENTENDA O CONTEXTO:
- O formulário de visita é preenchido pelo GESTOR (Supervisor ou Coordenador)
- O GESTOR acompanha o RCA (vendedor) durante a rota
- O RCA é quem trabalha na rota diariamente, visitando os clientes (PDVs)
- Cada visita registra: quem preencheu (manager), quem foi acompanhado (rca_accompanied), e o cliente visitado (client_code)

FOCO DA ANÁLISE:
- Analise SOMENTE os dados do formulário de visitas
- Dê especial atenção aos COMENTÁRIOS e OBSERVAÇÕES preenchidos pelos gestores
- Identifique padrões nos textos de rupturas, observações de vendedores, e oportunidades
- NÃO analise feedbacks - foque apenas no formulário de acompanhamento

TIPOS DE ANÁLISE:
- general: Resumo executivo focado em métricas e comentários do formulário
- manager_performance: Análise do trabalho dos GESTORES (supervisores/coordenadores) - quantas visitas, quais RCAs acompanharam, qualidade das avaliações
- team_performance: Comparação entre equipes
- rca_coverage: Quais RCAs estão sendo acompanhados e quais precisam de mais supervisão
- client_analysis: Padrões e problemas por cliente/PDV
- problems: Problemas identificados nas visitas (rupturas, sortimento, preços)
- opportunities: Oportunidades de mix e visibilidade identificadas
- comments_analysis: Análise detalhada dos comentários e observações preenchidos no formulário
- comparative: Análise comparativa entre períodos

IMPORTANTE:
- Seja objetivo e acionável
- Use dados concretos dos períodos fornecidos
- Identifique padrões nos comentários/observações textuais
- Destaque rupturas recorrentes e observações importantes
- Sugira ações específicas baseadas nos dados do formulário
- Responda em português brasileiro`;

    const userPrompt = analysisType === 'general' 
      ? `Forneça uma análise executiva completa dos dados do formulário de visitas, incluindo: resumo geral das métricas, análise dos comentários e observações preenchidos, principais alertas, oportunidades identificadas, e recomendações de ação.`
      : analysisType === 'manager_performance'
      ? `Analise o desempenho dos GESTORES (supervisores/coordenadores) que preenchem os formulários:
         - Quantas visitas cada gestor realizou
         - Quantos RCAs diferentes cada gestor acompanhou (cobertura da equipe)
         - Quantos clientes/PDVs diferentes visitou
         - Qualidade das avaliações (médias de relacionamento, execução, entrega)
         - Gestores que mais identificaram oportunidades e problemas
         - Gestores mais produtivos vs os que precisam de atenção`
      : analysisType === 'team_performance'
      ? `Compare o desempenho entre as equipes baseado nos dados do formulário, identificando as melhores práticas e áreas que precisam de atenção.`
      : analysisType === 'rca_coverage'
      ? `Analise a COBERTURA DE ACOMPANHAMENTO dos RCAs:
         - Quais RCAs estão sendo mais acompanhados pelos gestores
         - RCAs que precisam de mais visitas de supervisão
         - Distribuição de acompanhamentos por RCA
         - RCAs com mais problemas identificados nas visitas
         - RCAs com melhores/piores avaliações quando acompanhados`
      : analysisType === 'client_analysis'
      ? `Analise os CLIENTES (PDVs) visitados:
         - Clientes com mais visitas (bem cobertos)
         - Clientes com problemas recorrentes
         - Rupturas frequentes por cliente
         - Oportunidades identificadas por PDV
         - Clientes que precisam de mais atenção`
      : analysisType === 'problems'
      ? `Identifique todos os problemas recorrentes nos formulários: rupturas descritas, problemas de sortimento, preços incorretos e outras situações críticas.`
      : analysisType === 'opportunities'
      ? `Liste e detalhe todas as oportunidades identificadas nos formulários: expansão de mix, melhoria de visibilidade, detalhes fornecidos pelos gestores.`
      : analysisType === 'comments_analysis'
      ? `Analise detalhadamente todos os comentários e observações preenchidos nos formulários: padrões recorrentes, temas importantes, observações sobre vendedores, descrições de rupturas, e insights relevantes.`
      : `Compare o período atual com o período anterior. Calcule variações percentuais em todos os KPIs do formulário. Identifique: 1) Melhorias significativas, 2) Regressões que exigem atenção, 3) Tendências nas observações. Seja específico com números e percentuais.`;

    // Chamar Google Gemini com tool calling para resposta estruturada
    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${geminiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_insights',
            description: 'Retorna insights estruturados sobre as operações baseados no formulário de visitas',
            parameters: {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'Resumo executivo em markdown'
                },
                alerts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      relatedVendor: { type: 'string' },
                      metric: { type: 'string' }
                    },
                    required: ['severity', 'title', 'description']
                  }
                },
                opportunities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                      clientCode: { type: 'string' }
                    },
                    required: ['title', 'description', 'impact']
                  }
                },
                topPerformers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      metric: { type: 'string' },
                      value: { type: 'string' },
                      reason: { type: 'string' }
                    },
                    required: ['name', 'metric', 'value']
                  }
                },
                bottomPerformers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      metric: { type: 'string' },
                      value: { type: 'string' },
                      reason: { type: 'string' }
                    },
                    required: ['name', 'metric', 'value']
                  }
                },
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      action: { type: 'string' },
                      priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                      description: { type: 'string' }
                    },
                    required: ['action', 'priority']
                  }
                }
              },
              required: ['summary', 'alerts', 'opportunities', 'recommendations']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'return_insights' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns instantes.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 403) {
        return new Response(JSON.stringify({ error: 'Chave API do Gemini inválida ou sem permissão.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('Erro ao chamar AI gateway');
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('Resposta da IA não contém tool_call esperado');
    }

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
