import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Validate user authentication before processing
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user with the token
    const token = authHeader.replace('Bearer ', '');
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Authentication failed:", userError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Use service role key for subsequent queries (after auth is validated)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is approved (has a role assigned)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("User not approved:", roleError?.message || "No role found");
      return new Response(
        JSON.stringify({ error: 'Usuário não aprovado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    const isAdmin = roleData.role === 'admin';
    console.log(`Authenticated user: ${user.email}, role: ${roleData.role}, isAdmin: ${isAdmin}`);

    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada");
    }

    // supabase client with service role is already created above as 'supabase'

    // Detectar entidades na última mensagem do usuário
    const lastMessage = messages[messages.length - 1]?.content || "";
    console.log("Mensagem do usuário:", lastMessage);

    // Buscar dados relevantes baseado na mensagem
    let contextData = "";
    
    // Buscar visitas - filtrar por created_by se não for admin
    let visitsQuery = supabase
      .from('visit_forms')
      .select('*')
      .order('visit_date', { ascending: false })
      .limit(100);

    if (!isAdmin) {
      visitsQuery = visitsQuery.eq('created_by', user.id);
    }

    const { data: visits, error: visitsError } = await visitsQuery;

    // Buscar feedbacks - filtrar por created_by se não for admin
    let feedbacksQuery = supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!isAdmin) {
      feedbacksQuery = feedbacksQuery.eq('created_by', user.id);
    }

    const { data: feedbacks, error: feedbacksError } = await feedbacksQuery;

    const { data: teams, error: teamsError } = await supabase
      .from('teams_vendors')
      .select('*');

    if (!visitsError && visits) {
      contextData += `\n\n=== DADOS DE VISITAS (últimas 100) ===\n`;
      contextData += `Total de visitas: ${visits.length}\n\n`;
      
      // Adicionar detalhes das visitas
      visits.slice(0, 10).forEach((v, idx) => {
        contextData += `Visita ${idx + 1}:\n`;
        contextData += `- Data: ${v.visit_date}\n`;
        contextData += `- Gestor: ${v.manager}\n`;
        contextData += `- RCA: ${v.rca_accompanied}\n`;
        contextData += `- Código Cliente: ${v.client_code}\n`;
        contextData += `- Níveis: Relacionamento=${v.relationship_level}, Execução=${v.execution_level}, Entrega=${v.delivery_level}\n`;
        contextData += `- Sortimento adequado: ${v.adequate_assortment_available ? 'Sim' : 'Não'}\n`;
        contextData += `- Preços visíveis/corretos: ${v.prices_visible_correct ? 'Sim' : 'Não'}\n`;
        contextData += `- Tem oportunidades expansão mix: ${v.has_mix_expansion_opportunities ? 'Sim' : 'Não'}\n`;
        contextData += `- Tem oportunidades melhoria visibilidade: ${v.has_visibility_improvement_opportunities ? 'Sim' : 'Não'}\n`;
        if (v.ruptures_description) contextData += `- Rupturas: ${v.ruptures_description}\n`;
        if (v.additional_comments) contextData += `- Comentários: ${v.additional_comments}\n`;
        contextData += `\n`;
      });

      // Adicionar estatísticas agregadas
      const avgRelationship = visits.filter(v => v.relationship_level).reduce((sum, v) => sum + v.relationship_level, 0) / visits.filter(v => v.relationship_level).length;
      const avgExecution = visits.filter(v => v.execution_level).reduce((sum, v) => sum + v.execution_level, 0) / visits.filter(v => v.execution_level).length;
      const avgDelivery = visits.filter(v => v.delivery_level).reduce((sum, v) => sum + v.delivery_level, 0) / visits.filter(v => v.delivery_level).length;
      
      contextData += `\n=== ESTATÍSTICAS AGREGADAS ===\n`;
      contextData += `- Média Relacionamento: ${avgRelationship.toFixed(2)}/5\n`;
      contextData += `- Média Execução: ${avgExecution.toFixed(2)}/5\n`;
      contextData += `- Média Entrega: ${avgDelivery.toFixed(2)}/5\n`;
      contextData += `- Visitas com oportunidade expansão: ${visits.filter(v => v.has_mix_expansion_opportunities).length}\n`;
      contextData += `- Visitas com oportunidade visibilidade: ${visits.filter(v => v.has_visibility_improvement_opportunities).length}\n`;
    }

    if (!feedbacksError && feedbacks) {
      contextData += `\n\n=== FEEDBACKS (últimos 50) ===\n`;
      contextData += `Total de feedbacks: ${feedbacks.length}\n\n`;
      
      feedbacks.slice(0, 10).forEach((f, idx) => {
        contextData += `Feedback ${idx + 1}:\n`;
        contextData += `- Código Vendedor: ${f.vendor_code}\n`;
        contextData += `- Supervisor: ${f.supervisor}\n`;
        contextData += `- Crítica Construtiva: ${f.constructive_criticism}\n`;
        contextData += `- Plano de Ação: ${f.action_plan}\n`;
        contextData += `- Data: ${new Date(f.created_at).toLocaleDateString('pt-BR')}\n\n`;
      });
    }

    if (!teamsError && teams) {
      contextData += `\n\n=== EQUIPES E VENDEDORES ===\n`;
      const uniqueTeams = [...new Set(teams.map(t => t.nome_equipe))];
      contextData += `Total de equipes: ${uniqueTeams.length}\n`;
      contextData += `Total de vendedores: ${teams.length}\n`;
    }

    // Montar prompt do sistema com contexto
    const systemPrompt = `Você é um assistente especializado em análise de operações de vendas e distribuição da LOPES DISTRIBUIDORA.

SUAS CAPACIDADES:
- Analisar visitas de campo e feedbacks
- Identificar padrões de desempenho por vendedor, equipe ou cliente
- Sugerir planos de ação específicos e práticos
- Fornecer insights baseados em dados reais
- Responder perguntas sobre visitas específicas ou feedbacks

FORMATO DAS RESPOSTAS:
- Use português brasileiro
- Seja objetivo e acionável
- Use listas, bullet points e formatação quando apropriado
- Destaque pontos de atenção com **negrito**
- Sugira próximos passos concretos
- Use emojis para melhorar legibilidade (📊 📈 ⚠️ ✅ 🎯 💡)

MÉTRICAS IMPORTANTES:
- Níveis de 1-5: Relacionamento, Execução, Entrega (5 é excelente)
- Oportunidades: Expansão de mix, Melhoria de visibilidade
- Problemas comuns: Rupturas, Preços incorretos, Falta de material
- Análise de feedbacks: Críticas construtivas e planos de ação

DADOS DISPONÍVEIS:
${contextData}

Analise os dados acima e responda à pergunta do usuário de forma clara e acionável.`;

    console.log("Enviando para Google Gemini...");

    // Chamar Google Gemini com streaming
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Chave API do Gemini inválida ou sem permissão." }), 
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("Erro na API:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar requisição" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Retornar stream diretamente
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("Erro no chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
