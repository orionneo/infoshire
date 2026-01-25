// AI Knowledge Query API
// Always returns 200 with standard payload (anti-crash design)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Standard response structure
interface KnowledgeResponse {
  ok: boolean;
  mode?: 'OPEN_OS' | 'IN_OS' | 'GENERAL';
  normalized: {
    keywords: string[];
    terms: string[];
    categories: string[];
    signals_missing: string[];
  };
  knowledge: {
    term_definitions: Array<{
      term: string;
      definition_internal?: string;
      definition_web?: string;
      synonyms?: string[];
      category?: string;
    }>;
    common_causes: string[];
    suggested_checks: string[];
    similar_cases: Array<{
      similarity_score: number;
      description: string;
      solution: string;
      matching_terms: string[];
    }>;
  };
  // OPEN_OS specific fields
  suggestions?: {
    organized_description?: string;
    suggested_category?: string;
    initial_checklist?: string[];
    clarification_questions?: string[];
  };
  // IN_OS specific fields
  diagnosis?: {
    probable_causes: Array<{
      description: string;
      probability: number;
      reasoning: string;
    }>;
    suggested_tests: Array<{
      description: string;
      expected_result: string;
    }>;
    technical_observations: string[];
    complexity: 'low' | 'medium' | 'high';
    estimated_time?: string;
    common_parts?: Array<{
      part_name: string;
      replacement_frequency: string;
    }>;
  };
  meta: {
    used_web: boolean;
    fallback_reason: string | null;
    processing_time_ms: number;
  };
}

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

// Extract keywords from text
function extractKeywords(text: string): string[] {
  const stopwords = ['o', 'a', 'de', 'da', 'do', 'em', 'para', 'com', 'por', 'na', 'no', 'os', 'as', 'dos', 'das', 'um', 'uma', 'e', 'ou', 'que', 'se', 'ao', 'aos', 'esta', 'esse', 'isso', 'aqui', 'ali'];
  
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/).filter(w => w.length >= 3);
  
  return words.filter(word => !stopwords.includes(word));
}

// Detect technical terms (simple heuristic)
function detectTechnicalTerms(keywords: string[]): string[] {
  const technicalPatterns = [
    /^(nao|sem|dead|curto|aberto|queimad|oxidado)/,
    /^(reballing|bga|pmic|ic|chip|capacitor|resistor)/,
    /^(tela|display|lcd|led|backlight|bl)/,
    /^(bateria|carregador|fonte|power|energia)/,
    /^(placa|motherboard|logica|trilha)/,
    /^(botao|tecla|joystick|analogico)/,
  ];
  
  return keywords.filter(keyword => 
    technicalPatterns.some(pattern => pattern.test(keyword)) ||
    keyword.length >= 5 // Longer words tend to be technical
  );
}

// Log error to database (never throws)
async function logError(
  supabase: any,
  functionName: string,
  error: Error,
  inputSnapshot: any
): Promise<void> {
  try {
    await supabase.from('ai_errors').insert({
      function_name: functionName,
      error_message: error.message,
      error_stack: error.stack,
      input_snapshot: inputSnapshot,
    });
  } catch (logErr) {
    console.error('Failed to log error:', logErr);
  }
}

// Get AI configuration
async function getConfig(supabase: any, key: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('ai_config')
      .select('config_value')
      .eq('config_key', key)
      .eq('is_active', true)
      .maybeSingle();
    
    return data?.config_value || null;
  } catch {
    return null;
  }
}

// Search for similar cases
async function findSimilarCases(
  supabase: any,
  osId: string | null,
  keywords: string[],
  maxCases: number
): Promise<any[]> {
  try {
    if (!osId) return [];
    
    // Check cache first
    const { data: cached } = await supabase
      .from('ai_similar_cases')
      .select('*')
      .eq('os_id', osId)
      .order('similarity_score', { ascending: false })
      .limit(maxCases);
    
    if (cached && cached.length > 0) {
      return cached.map((c: any) => ({
        similarity_score: c.similarity_score,
        description: c.anonymized_description,
        solution: c.anonymized_solution,
        matching_terms: c.matching_terms || [],
      }));
    }
    
    // If no cache, return empty (cache will be built by background job)
    return [];
  } catch (error) {
    console.error('Error finding similar cases:', error);
    return [];
  }
}

// Query term definitions
async function queryTermDefinitions(
  supabase: any,
  terms: string[]
): Promise<any[]> {
  try {
    if (terms.length === 0) return [];
    
    const { data } = await supabase
      .from('ai_terms')
      .select('term, normalized_term, definition_internal, definition_web, synonyms, term_category')
      .in('normalized_term', terms.map(t => normalizeText(t)))
      .order('frequency', { ascending: false })
      .limit(10);
    
    return (data || []).map((t: any) => ({
      term: t.term,
      definition_internal: t.definition_internal,
      definition_web: t.definition_web,
      synonyms: t.synonyms || [],
      category: t.term_category,
    }));
  } catch (error) {
    console.error('Error querying terms:', error);
    return [];
  }
}

// Generate heuristic suggestions for OPEN_OS mode
function generateHeuristicSuggestions(text: string, equipamentoTipo?: string): AISuggestions {
  const lowerText = text.toLowerCase();
  
  // Categorias heurísticas
  let category = "Diagnóstico Geral";
  if (lowerText.includes("bateria") || lowerText.includes("carrega") || lowerText.includes("descarrega")) {
    category = "Bateria";
  } else if (lowerText.includes("tela") || lowerText.includes("display") || lowerText.includes("touch")) {
    category = "Tela/Display";
  } else if (lowerText.includes("não liga") || lowerText.includes("nao liga") || lowerText.includes("morto")) {
    category = "Hardware";
  } else if (lowerText.includes("lento") || lowerText.includes("trava") || lowerText.includes("congela")) {
    category = "Software";
  } else if (lowerText.includes("água") || lowerText.includes("agua") || lowerText.includes("molhou") || lowerText.includes("oxidação") || lowerText.includes("oxidacao")) {
    category = "Dano por Líquido";
  }

  // Checklist heurística
  const checklist: string[] = [];
  if (category === "Bateria") {
    checklist.push(
      "Testar com outro carregador original",
      "Verificar conector de carga",
      "Medir tensão da bateria",
      "Verificar oxidação nos contatos"
    );
  } else if (category === "Tela/Display") {
    checklist.push(
      "Verificar se tela está fisicamente danificada",
      "Testar touch screen",
      "Verificar conexão do flat da tela",
      "Testar com tela externa (se possível)"
    );
  } else if (category === "Hardware") {
    checklist.push(
      "Verificar se equipamento liga",
      "Testar botão de power",
      "Verificar sinais de curto-circuito",
      "Inspecionar placa-mãe"
    );
  } else if (category === "Software") {
    checklist.push(
      "Verificar espaço de armazenamento",
      "Testar em modo de segurança",
      "Verificar aplicativos recentemente instalados",
      "Considerar reset de fábrica"
    );
  } else if (category === "Dano por Líquido") {
    checklist.push(
      "Verificar indicadores de líquido",
      "Inspecionar oxidação na placa",
      "Limpar contatos oxidados",
      "Verificar curto-circuito"
    );
  } else {
    checklist.push(
      "Verificar estado físico do equipamento",
      "Testar ligação do aparelho",
      "Verificar acessórios incluídos",
      "Realizar diagnóstico completo"
    );
  }

  // Perguntas de esclarecimento
  const clarificationQuestions: string[] = [
    "Qual é o problema específico do equipamento?",
    "O equipamento liga?",
    "Quando o problema começou?",
    "Há sinais de dano físico?",
  ];

  if (text.length < 30) {
    clarificationQuestions.push(
      "O problema ocorre sempre ou apenas às vezes?",
      "O equipamento sofreu alguma queda ou contato com líquido?"
    );
  }

  return {
    organized_description: text.trim() || "",
    suggested_category: category,
    initial_checklist: checklist,
    clarification_questions: clarificationQuestions,
  };
}

interface AISuggestions {
  organized_description: string;
  suggested_category: string;
  initial_checklist: string[];
  clarification_questions: string[];
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  // Default response structure
  const defaultResponse: KnowledgeResponse = {
    ok: true,
    normalized: {
      keywords: [],
      terms: [],
      categories: [],
      signals_missing: [],
    },
    knowledge: {
      term_definitions: [],
      common_causes: [],
      suggested_checks: [],
      similar_cases: [],
    },
    meta: {
      used_web: false,
      fallback_reason: null,
      processing_time_ms: 0,
    },
  };

  try {
    // Parse request
    const { text, equipamento_tipo, marca, modelo, context } = await req.json();
    
    // Get mode from context
    const mode = context?.mode || 'GENERAL';
    defaultResponse.mode = mode;
    
    // Initialize Supabase client (with fallback handling)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // If no DB secrets, return fallback with heuristic suggestions
    if (!supabaseUrl || !supabaseKey) {
      console.warn('No database secrets found, using fallback mode');
      defaultResponse.meta.fallback_reason = 'NO_DB_SECRETS';
      defaultResponse.meta.processing_time_ms = Date.now() - startTime;
      
      // Generate heuristic suggestions for OPEN_OS mode
      if (mode === 'OPEN_OS' && text && text.trim().length > 0) {
        defaultResponse.suggestions = generateHeuristicSuggestions(text, equipamento_tipo);
      }
      
      return new Response(JSON.stringify(defaultResponse), {
        headers: corsHeaders,
        status: 200,
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Validate input
    if (!text || text.trim().length === 0) {
      defaultResponse.meta.fallback_reason = 'INSUFFICIENT_INPUT';
      defaultResponse.meta.processing_time_ms = Date.now() - startTime;
      
      // Even with insufficient input, provide default suggestions for OPEN_OS
      if (mode === 'OPEN_OS') {
        defaultResponse.suggestions = generateHeuristicSuggestions("", equipamento_tipo);
      }
      
      return new Response(JSON.stringify(defaultResponse), {
        headers: corsHeaders,
        status: 200,
      });
    }
    
    // Extract keywords and terms
    const keywords = extractKeywords(text);
    const technicalTerms = detectTechnicalTerms(keywords);
    
    defaultResponse.normalized.keywords = keywords;
    defaultResponse.normalized.terms = technicalTerms;
    
    // Check for missing signals
    const signals_missing: string[] = [];
    if (!equipamento_tipo) signals_missing.push('equipamento_tipo');
    if (!marca) signals_missing.push('marca');
    if (!modelo) signals_missing.push('modelo');
    defaultResponse.normalized.signals_missing = signals_missing;
    
    // Query term definitions
    const termDefinitions = await queryTermDefinitions(supabase, technicalTerms);
    defaultResponse.knowledge.term_definitions = termDefinitions;
    
    // Find similar cases
    const maxCases = parseInt(await getConfig(supabase, 'MAX_SIMILAR_CASES') || '5');
    const similarCases = await findSimilarCases(
      supabase,
      context?.os_id || null,
      keywords,
      maxCases
    );
    defaultResponse.knowledge.similar_cases = similarCases;
    
    // Generate common causes based on terms
    const commonCauses: string[] = [];
    for (const term of technicalTerms) {
      if (term.includes('nao') || term.includes('sem')) {
        commonCauses.push(`Verificar conexões e alimentação`);
      }
      if (term.includes('tela') || term.includes('display')) {
        commonCauses.push(`Verificar cabo flat da tela`);
        commonCauses.push(`Testar backlight`);
      }
      if (term.includes('bateria')) {
        commonCauses.push(`Verificar estado da bateria`);
        commonCauses.push(`Testar carregamento`);
      }
    }
    defaultResponse.knowledge.common_causes = [...new Set(commonCauses)].slice(0, 5);
    
    // Generate suggested checks
    const suggestedChecks: string[] = [];
    if (technicalTerms.length > 0) {
      suggestedChecks.push('Realizar inspeção visual completa');
      suggestedChecks.push('Verificar histórico de reparos anteriores');
      suggestedChecks.push('Testar componentes relacionados');
    }
    defaultResponse.knowledge.suggested_checks = suggestedChecks;
    
    // MODE-SPECIFIC PROCESSING
    
    // OPEN_OS Mode: Assist with opening a new OS
    if (mode === 'OPEN_OS') {
      // Always generate suggestions, even with short text
      const heuristicSuggestions = generateHeuristicSuggestions(text, equipamento_tipo);
      
      // Enhance with database knowledge if available
      const suggestions: AISuggestions = {
        organized_description: heuristicSuggestions.organized_description,
        suggested_category: heuristicSuggestions.suggested_category,
        initial_checklist: heuristicSuggestions.initial_checklist,
        clarification_questions: heuristicSuggestions.clarification_questions,
      };
      
      // Override category if we have better knowledge from terms
      if (technicalTerms.some(t => t.includes('tela') || t.includes('display'))) {
        suggestions.suggested_category = 'Tela/Display';
      } else if (technicalTerms.some(t => t.includes('bateria'))) {
        suggestions.suggested_category = 'Bateria';
      } else if (technicalTerms.some(t => t.includes('placa') || t.includes('motherboard'))) {
        suggestions.suggested_category = 'Placa-mãe';
      } else if (technicalTerms.some(t => t.includes('agua') || t.includes('molhado') || t.includes('oxidado'))) {
        suggestions.suggested_category = 'Dano por Líquido';
      }
      
      // Enhance checklist with database knowledge
      if (technicalTerms.some(t => t.includes('agua') || t.includes('molhado'))) {
        if (!suggestions.initial_checklist.includes('Verificar sinais de oxidação')) {
          suggestions.initial_checklist.push('Verificar sinais de oxidação');
        }
      }
      if (technicalTerms.some(t => t.includes('tela'))) {
        if (!suggestions.initial_checklist.includes('Testar touch screen')) {
          suggestions.initial_checklist.push('Testar touch screen');
        }
      }
      if (technicalTerms.some(t => t.includes('bateria'))) {
        if (!suggestions.initial_checklist.includes('Medir tensão da bateria')) {
          suggestions.initial_checklist.push('Medir tensão da bateria');
        }
      }
      
      // Ensure we always have suggestions
      defaultResponse.suggestions = suggestions;
    }
    
    // IN_OS Mode: Assist with diagnosis inside an existing OS
    if (mode === 'IN_OS') {
      const diagnosis: any = {
        probable_causes: [],
        suggested_tests: [],
        technical_observations: [],
        complexity: 'medium',
      };
      
      // Generate probable causes with probability
      const causes: Array<{description: string; probability: number; reasoning: string}> = [];
      
      if (technicalTerms.some(t => t.includes('nao') && (t.includes('liga') || t.includes('ligar')))) {
        causes.push({
          description: 'Problema na fonte de alimentação ou bateria',
          probability: 70,
          reasoning: 'Sintoma comum de falha no circuito de alimentação',
        });
        causes.push({
          description: 'Curto-circuito na placa-mãe',
          probability: 50,
          reasoning: 'Pode impedir a inicialização do sistema',
        });
      }
      
      if (technicalTerms.some(t => t.includes('tela') || t.includes('display'))) {
        causes.push({
          description: 'Cabo flat da tela danificado ou desconectado',
          probability: 65,
          reasoning: 'Causa mais comum de problemas de display',
        });
        causes.push({
          description: 'Backlight queimado',
          probability: 45,
          reasoning: 'Tela acende mas não há iluminação',
        });
      }
      
      if (technicalTerms.some(t => t.includes('bateria'))) {
        causes.push({
          description: 'Bateria viciada ou fim de vida útil',
          probability: 80,
          reasoning: 'Baterias degradam com o tempo e uso',
        });
        causes.push({
          description: 'Circuito de carga defeituoso',
          probability: 40,
          reasoning: 'Impede carregamento adequado da bateria',
        });
      }
      
      // If no specific causes found, add generic ones
      if (causes.length === 0) {
        causes.push({
          description: 'Componente eletrônico defeituoso',
          probability: 50,
          reasoning: 'Diagnóstico requer testes específicos',
        });
        causes.push({
          description: 'Problema de software/firmware',
          probability: 30,
          reasoning: 'Pode ser resolvido com atualização ou reset',
        });
      }
      
      diagnosis.probable_causes = causes.sort((a, b) => b.probability - a.probability).slice(0, 4);
      
      // Generate suggested tests
      const tests: Array<{description: string; expected_result: string}> = [];
      
      if (technicalTerms.some(t => t.includes('nao') && t.includes('liga'))) {
        tests.push({
          description: 'Medir tensão da bateria com multímetro',
          expected_result: 'Tensão nominal do equipamento (ex: 3.7V para celular)',
        });
        tests.push({
          description: 'Testar com fonte externa',
          expected_result: 'Equipamento deve ligar se bateria estiver defeituosa',
        });
      }
      
      if (technicalTerms.some(t => t.includes('tela'))) {
        tests.push({
          description: 'Verificar conexão do cabo flat',
          expected_result: 'Cabo deve estar firmemente conectado sem sinais de dano',
        });
        tests.push({
          description: 'Testar com tela externa (se possível)',
          expected_result: 'Imagem deve aparecer se tela original estiver defeituosa',
        });
      }
      
      if (tests.length === 0) {
        tests.push({
          description: 'Inspeção visual completa da placa',
          expected_result: 'Identificar componentes queimados, oxidados ou danificados',
        });
        tests.push({
          description: 'Teste de continuidade nos circuitos principais',
          expected_result: 'Verificar se há curtos ou circuitos abertos',
        });
      }
      
      diagnosis.suggested_tests = tests.slice(0, 4);
      
      // Technical observations
      const observations: string[] = [];
      
      if (technicalTerms.some(t => t.includes('agua') || t.includes('molhado') || t.includes('oxidado'))) {
        observations.push('⚠️ Equipamento com histórico de contato com líquido - risco de oxidação progressiva');
        diagnosis.complexity = 'high';
      }
      
      if (technicalTerms.some(t => t.includes('placa') || t.includes('motherboard'))) {
        observations.push('⚠️ Problema na placa-mãe pode requerer micro-soldagem');
        diagnosis.complexity = 'high';
      }
      
      if (similarCases.length > 0) {
        observations.push(`✓ Encontrados ${similarCases.length} casos similares no histórico`);
      }
      
      if (observations.length === 0) {
        observations.push('Realizar diagnóstico completo antes de iniciar reparo');
      }
      
      diagnosis.technical_observations = observations;
      
      // Estimate time based on complexity and similar cases
      if (similarCases.length > 0) {
        diagnosis.estimated_time = '2-5 dias úteis';
      } else if (diagnosis.complexity === 'high') {
        diagnosis.estimated_time = '5-10 dias úteis';
      } else if (diagnosis.complexity === 'medium') {
        diagnosis.estimated_time = '3-7 dias úteis';
      } else {
        diagnosis.estimated_time = '1-3 dias úteis';
      }
      
      // Common parts
      const parts: Array<{part_name: string; replacement_frequency: string}> = [];
      
      if (technicalTerms.some(t => t.includes('tela'))) {
        parts.push({ part_name: 'Display LCD/OLED', replacement_frequency: 'Alta' });
        parts.push({ part_name: 'Touch Screen', replacement_frequency: 'Média' });
      }
      
      if (technicalTerms.some(t => t.includes('bateria'))) {
        parts.push({ part_name: 'Bateria', replacement_frequency: 'Muito Alta' });
      }
      
      if (parts.length > 0) {
        diagnosis.common_parts = parts;
      }
      
      defaultResponse.diagnosis = diagnosis;
    }
    
    // Check if web enrichment is enabled (disabled for now to ensure stability)
    // const webEnabled = (await getConfig(supabase, 'WEB_ENABLED')) === 'true';
    // Web enrichment temporarily disabled for stability
    defaultResponse.meta.used_web = false;
    
    // Calculate processing time
    defaultResponse.meta.processing_time_ms = Date.now() - startTime;
    
    return new Response(JSON.stringify(defaultResponse), {
      headers: corsHeaders,
      status: 200,
    });
    
  } catch (error) {
    // Log error but still return 200
    console.error('AI Knowledge Query Error:', error);
    console.error('Error stack:', (error as Error).stack);
    console.error('Error message:', (error as Error).message);
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await logError(supabase, 'ai-knowledge-query', error as Error, {
          url: req.url,
          method: req.method,
        });
      }
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }
    
    // Generate fallback suggestions even on error
    const fallbackSuggestions = generateHeuristicSuggestions('', '', '', '');
    defaultResponse.suggestions = fallbackSuggestions;
    defaultResponse.meta.fallback_reason = 'INTERNAL_ERROR';
    defaultResponse.meta.processing_time_ms = Date.now() - startTime;
    
    return new Response(JSON.stringify(defaultResponse), {
      headers: corsHeaders,
      status: 200,
    });
  }
});
