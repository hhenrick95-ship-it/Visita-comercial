import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AIInsight {
  summary: string;
  alerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    relatedVendor?: string;
    metric?: string;
  }>;
  opportunities: Array<{
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    clientCode?: string;
  }>;
  topPerformers: Array<{
    name: string;
    metric: string;
    value: string;
    reason?: string;
  }>;
  bottomPerformers: Array<{
    name: string;
    metric: string;
    value: string;
    reason?: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    description?: string;
  }>;
}

export type AnalysisType = 'general' | 'manager_performance' | 'team_performance' | 'rca_coverage' | 'client_analysis' | 'problems' | 'opportunities' | 'comments_analysis' | 'comparative' | 'feedback_analysis';

interface CachedInsight {
  data: AIInsight;
  timestamp: number;
  filters: string;
  analysisType: AnalysisType;
}

const CACHE_KEY = 'ai_insights_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function useAIInsights() {
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  

  // Carregar do cache ao iniciar
  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      setInsights(cached.data);
      setLastAnalysisTime(new Date(cached.timestamp));
    }
  }, []);

  const getCacheKey = (filters: any, analysisType: AnalysisType) => {
    return JSON.stringify({ filters, analysisType });
  };

  const loadFromCache = (): CachedInsight | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsed: CachedInsight = JSON.parse(cached);
      const now = Date.now();

      // Verificar se o cache ainda é válido (TTL)
      if (now - parsed.timestamp > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  };

  const saveToCache = (data: AIInsight, filters: any, analysisType: AnalysisType) => {
    try {
      const cached: CachedInsight = {
        data,
        timestamp: Date.now(),
        filters: getCacheKey(filters, analysisType),
        analysisType
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  };

  const generateInsights = async (
    filters: {
      startDate?: string;
      endDate?: string;
      manager?: string;
      rca?: string;
      clientCode?: string;
      team?: string;
      region?: string;
      clientType?: string;
      templateId?: string;
    },
    analysisType: AnalysisType = 'general',
    skipCache = false
  ) => {
    const cacheKey = getCacheKey(filters, analysisType);

    // Verificar cache primeiro (se não for forçado a pular)
    if (!skipCache) {
      const cached = loadFromCache();
      if (cached && cached.filters === cacheKey) {
        setInsights(cached.data);
        setLastAnalysisTime(new Date(cached.timestamp));
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error: functionError } = await supabase.functions.invoke('ai-insights', {
        body: { filters, analysisType },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (functionError) {
        // Tratar erros de rate limit/chave inválida de forma amigável
        const errMsg = functionError.message || String(functionError);
        if (errMsg.includes('403') || errMsg.includes('Chave API')) {
          throw new Error('Chave API do Gemini inválida ou sem permissão. Verifique a configuração.');
        }
        if (errMsg.includes('429') || errMsg.includes('Rate limit')) {
          throw new Error('Muitas requisições. Aguarde alguns instantes e tente novamente.');
        }
        throw functionError;
      }

      if (data?.error) {
        if (data.error.includes('Chave API') || data.error.includes('403')) {
          throw new Error('Chave API do Gemini inválida ou sem permissão. Verifique a configuração.');
        }
        if (data.error.includes('Rate limit') || data.error.includes('429')) {
          throw new Error('Muitas requisições. Aguarde alguns instantes e tente novamente.');
        }
        throw new Error(data.error);
      }

      setInsights(data);
      const now = new Date();
      setLastAnalysisTime(now);
      saveToCache(data, filters, analysisType);
    } catch (err) {
      console.error('Error generating insights:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar insights');
    } finally {
      setLoading(false);
    }
  };

  const clearInsights = () => {
    setInsights(null);
    setError(null);
    setLastAnalysisTime(null);
    localStorage.removeItem(CACHE_KEY);
  };

  return {
    insights,
    loading,
    error,
    lastAnalysisTime,
    generateInsights,
    clearInsights
  };
}
