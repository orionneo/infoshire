// Search Tech Web - Web Enrichment for AI Terms
// Searches Wikipedia and other sources for technical term definitions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Normalize Portuguese text
function normalizeText(text: string): string {
  const accents = 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ';
  const without = 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn';
  
  let normalized = text.toLowerCase();
  for (let i = 0; i < accents.length; i++) {
    normalized = normalized.replace(new RegExp(accents[i], 'g'), without[i]);
  }
  return normalized;
}

// Search Wikipedia for term definition
async function searchWikipedia(term: string): Promise<{ definition: string; source: string } | null> {
  try {
    // Try Portuguese Wikipedia first
    const ptUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
    const ptResponse = await fetch(ptUrl, {
      headers: {
        'User-Agent': 'TechRepairAssistant/1.0',
      },
    });
    
    if (ptResponse.ok) {
      const data = await ptResponse.json();
      if (data.extract && data.extract.length > 20) {
        return {
          definition: data.extract.substring(0, 500), // Limit to 500 chars
          source: `Wikipedia PT: ${data.content_urls?.desktop?.page || 'https://pt.wikipedia.org'}`,
        };
      }
    }
    
    // Try English Wikipedia as fallback
    const enUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
    const enResponse = await fetch(enUrl, {
      headers: {
        'User-Agent': 'TechRepairAssistant/1.0',
      },
    });
    
    if (enResponse.ok) {
      const data = await enResponse.json();
      if (data.extract && data.extract.length > 20) {
        return {
          definition: data.extract.substring(0, 500),
          source: `Wikipedia EN: ${data.content_urls?.desktop?.page || 'https://en.wikipedia.org'}`,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Wikipedia search failed for term "${term}":`, error);
    return null;
  }
}

// Search for technical term definitions using heuristics
function getHeuristicDefinition(term: string): { definition: string; source: string } | null {
  const lowerTerm = term.toLowerCase();
  
  // Common technical terms in Portuguese
  const definitions: Record<string, string> = {
    'backlight': 'Sistema de iluminação traseira de telas LCD que permite a visualização da imagem. Quando defeituoso, a tela fica escura mesmo com o aparelho ligado.',
    'flat': 'Cabo flat é um tipo de cabo flexível usado para conectar componentes eletrônicos, comum em displays, teclados e outros periféricos.',
    'oxidacao': 'Oxidação é o processo de corrosão de componentes eletrônicos causado por umidade ou contato com líquidos, formando uma camada que impede o funcionamento correto.',
    'oxidação': 'Oxidação é o processo de corrosão de componentes eletrônicos causado por umidade ou contato com líquidos, formando uma camada que impede o funcionamento correto.',
    'reballing': 'Reballing é o processo de remoção e substituição das esferas de solda (balls) de um chip BGA, usado para reparar conexões defeituosas na placa-mãe.',
    'bga': 'BGA (Ball Grid Array) é um tipo de encapsulamento de chip que usa esferas de solda para conexão com a placa. Comum em processadores e chips de memória.',
    'pmic': 'PMIC (Power Management Integrated Circuit) é o chip responsável pelo gerenciamento de energia do dispositivo, controlando voltagens e carregamento.',
    'ic': 'IC (Integrated Circuit ou Circuito Integrado) é um chip eletrônico que contém múltiplos componentes em um único encapsulamento.',
    'curto': 'Curto-circuito é uma conexão não intencional entre dois pontos de um circuito elétrico, causando fluxo excessivo de corrente e possível dano aos componentes.',
    'trilha': 'Trilha é o caminho condutor de cobre na placa de circuito impresso (PCB) que conecta os componentes eletrônicos.',
    'touch': 'Touch screen ou tela sensível ao toque é a camada capacitiva ou resistiva que detecta o toque do usuário na tela.',
    'display': 'Display é o componente de exibição visual do dispositivo, podendo ser LCD, OLED, AMOLED, entre outros.',
    'lcd': 'LCD (Liquid Crystal Display) é um tipo de tela que usa cristais líquidos para formar imagens, requerendo backlight para iluminação.',
    'oled': 'OLED (Organic Light-Emitting Diode) é um tipo de tela que emite luz própria, não necessitando de backlight, oferecendo melhor contraste.',
    'bateria': 'Bateria é o componente que armazena energia química e a converte em energia elétrica para alimentar o dispositivo.',
    'conector': 'Conector é o componente que permite a conexão física e elétrica entre diferentes partes do dispositivo ou com acessórios externos.',
    'placa': 'Placa-mãe ou motherboard é a placa de circuito principal que conecta todos os componentes do dispositivo.',
    'firmware': 'Firmware é o software de baixo nível gravado permanentemente no hardware, controlando as funções básicas do dispositivo.',
  };
  
  for (const [key, definition] of Object.entries(definitions)) {
    if (lowerTerm.includes(key) || normalizeText(lowerTerm).includes(normalizeText(key))) {
      return {
        definition,
        source: 'Base de Conhecimento Interna',
      };
    }
  }
  
  return null;
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { terms } = await req.json();
    
    if (!Array.isArray(terms) || terms.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        enriched_count: 0,
        message: 'No terms provided',
      }), {
        headers: corsHeaders,
        status: 200,
      });
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        ok: true,
        enriched_count: 0,
        message: 'Database not configured',
      }), {
        headers: corsHeaders,
        status: 200,
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let enrichedCount = 0;
    
    // Process each term
    for (const term of terms) {
      if (!term || term.length < 3) continue;
      
      const normalizedTerm = normalizeText(term);
      
      // Check if term already exists in database
      const { data: existing } = await supabase
        .from('ai_terms')
        .select('term, definition_web')
        .eq('normalized_term', normalizedTerm)
        .maybeSingle();
      
      // Skip if already has web definition
      if (existing && existing.definition_web) {
        continue;
      }
      
      // Try to find definition
      let definition: { definition: string; source: string } | null = null;
      
      // First try heuristic definitions (faster)
      definition = getHeuristicDefinition(term);
      
      // If no heuristic definition, try Wikipedia
      if (!definition) {
        definition = await searchWikipedia(term);
      }
      
      // If we found a definition, save it
      if (definition) {
        if (existing) {
          // Update existing term
          await supabase
            .from('ai_terms')
            .update({
              definition_web: definition.definition,
              definition_web_source: definition.source,
              updated_at: new Date().toISOString(),
            })
            .eq('normalized_term', normalizedTerm);
        } else {
          // Insert new term
          await supabase
            .from('ai_terms')
            .insert({
              term: term,
              normalized_term: normalizedTerm,
              definition_web: definition.definition,
              definition_web_source: definition.source,
              frequency: 1,
              term_category: 'Web Enriched',
            });
        }
        
        enrichedCount++;
      }
    }
    
    return new Response(JSON.stringify({
      ok: true,
      enriched_count: enrichedCount,
      total_terms: terms.length,
    }), {
      headers: corsHeaders,
      status: 200,
    });
    
  } catch (error) {
    console.error('Search Tech Web Error:', error);
    
    return new Response(JSON.stringify({
      ok: false,
      enriched_count: 0,
      error: error.message,
    }), {
      headers: corsHeaders,
      status: 200, // Still return 200 to avoid breaking the main flow
    });
  }
});
