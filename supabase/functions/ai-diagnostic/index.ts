// Edge Function: AI Diagnostic Assistant
// Analyzes service order problems and suggests diagnoses

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticRequest {
  problem_description: string;
  equipment: string;
  brand?: string;
  model?: string;
  client_id?: string;
}

interface DiagnosticResponse {
  causes: Array<{
    description: string;
    probability: number;
    reasoning: string;
  }>;
  tests: Array<{
    description: string;
    expected_result: string;
  }>;
  risk_assessment: {
    return_risk: 'low' | 'medium' | 'high';
    risk_factors: string[];
  };
  common_parts: Array<{
    part_name: string;
    replacement_frequency: string;
  }>;
  estimated_time: string;
  estimated_cost_range: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const { problem_description, equipment, brand, model, client_id }: DiagnosticRequest = await req.json();

    // Validate required fields
    if (!problem_description || !equipment) {
      return new Response(
        JSON.stringify({ error: 'problem_description and equipment are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get historical data for similar equipment
    const { data: historicalOrders, error: historyError } = await supabase
      .from('service_orders')
      .select('equipment, problem_description, status, total_cost, retorno_garantia')
      .ilike('equipment', `%${equipment}%`)
      .limit(20);

    if (historyError) {
      console.error('Error fetching historical orders:', historyError);
    }

    // Get client's previous orders if client_id provided
    let clientHistory: any[] = [];
    if (client_id) {
      const { data: clientOrders } = await supabase
        .from('service_orders')
        .select('equipment, problem_description, status, retorno_garantia')
        .eq('client_id', client_id)
        .limit(10);
      
      clientHistory = clientOrders || [];
    }

    // Prepare context for AI
    const historicalContext = historicalOrders
      ? historicalOrders.map(o => ({
          equipment: o.equipment,
          problem: o.problem_description,
          had_return: o.retorno_garantia,
          cost: o.total_cost
        }))
      : [];

    // Call OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um assistente especializado em diagnóstico de equipamentos eletrônicos para assistências técnicas.
Sua função é analisar problemas relatados e sugerir possíveis causas, testes e peças necessárias.

IMPORTANTE:
- Seja específico e técnico
- Ordene causas por probabilidade (%)
- Sugira testes práticos e rápidos
- Considere histórico de problemas similares
- Indique risco de retorno (baixo/médio/alto)
- Liste peças comumente associadas ao problema
- Estime tempo e custo aproximado

Responda SEMPRE em formato JSON válido com esta estrutura:
{
  "causes": [
    {
      "description": "Descrição da causa",
      "probability": 85,
      "reasoning": "Explicação técnica"
    }
  ],
  "tests": [
    {
      "description": "Teste a realizar",
      "expected_result": "Resultado esperado"
    }
  ],
  "risk_assessment": {
    "return_risk": "low|medium|high",
    "risk_factors": ["Fator 1", "Fator 2"]
  },
  "common_parts": [
    {
      "part_name": "Nome da peça",
      "replacement_frequency": "Frequência de troca"
    }
  ],
  "estimated_time": "Tempo estimado",
  "estimated_cost_range": "Faixa de custo"
}`;

    const userPrompt = `Analise o seguinte problema:

EQUIPAMENTO: ${equipment}
${brand ? `MARCA: ${brand}` : ''}
${model ? `MODELO: ${model}` : ''}

PROBLEMA RELATADO:
${problem_description}

${historicalContext.length > 0 ? `
HISTÓRICO DE PROBLEMAS SIMILARES (${historicalContext.length} casos):
${historicalContext.slice(0, 5).map((h, i) => `
${i + 1}. ${h.equipment}
   Problema: ${h.problem}
   Teve retorno: ${h.had_return ? 'Sim' : 'Não'}
   Custo: R$ ${h.cost || 'N/A'}
`).join('\n')}
` : ''}

${clientHistory.length > 0 ? `
HISTÓRICO DO CLIENTE (${clientHistory.length} ordens anteriores):
${clientHistory.slice(0, 3).map((h, i) => `
${i + 1}. ${h.equipment} - ${h.problem}
   Teve retorno: ${h.retorno_garantia ? 'Sim' : 'Não'}
`).join('\n')}
` : ''}

Forneça um diagnóstico assistido completo em JSON.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get AI diagnosis', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = JSON.parse(openaiData.choices[0].message.content);

    // Return diagnostic response
    return new Response(
      JSON.stringify(aiResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in ai-diagnostic function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
