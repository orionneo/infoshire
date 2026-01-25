// AI Web Search - Busca web gratuita com IA usando Gemini 2.5 Flash
// Fornece informações técnicas com citações de fontes confiáveis

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gateway-authorization',
  'Content-Type': 'application/json',
};

interface SearchRequest {
  query: string;
  context?: string; // Contexto adicional (ex: "abertura de OS", "diagnóstico", "validação")
}

interface SearchResponse {
  success: boolean;
  answer: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
  searchQueries: string[];
  error?: string;
}

// Função para fazer busca web com Gemini 2.5 Flash
async function searchWithGemini(query: string, context?: string): Promise<SearchResponse> {
  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  
  if (!apiKey) {
    throw new Error('API key não configurada');
  }

  // Construir prompt contextualizado
  let prompt = query;
  
  if (context === 'abertura_os') {
    prompt = `Como técnico de assistência técnica, preciso de informações sobre: ${query}. 
    
Forneça informações técnicas precisas incluindo:
- Especificações técnicas relevantes
- Problemas comuns conhecidos
- Componentes principais
- Informações úteis para diagnóstico

Seja objetivo e técnico. Cite as fontes.`;
  } else if (context === 'diagnostico') {
    prompt = `Como técnico diagnosticando um problema, preciso saber: ${query}.
    
Forneça:
- Causas comuns deste problema
- Testes diagnósticos recomendados
- Soluções conhecidas
- Peças que costumam falhar

Seja prático e técnico. Cite as fontes.`;
  } else if (context === 'validacao') {
    prompt = `Preciso validar informações técnicas sobre: ${query}.
    
Forneça:
- Definição técnica precisa
- Uso em eletrônicos/computadores
- Informações relevantes para técnicos
- Termos relacionados

Seja preciso e educativo. Cite as fontes.`;
  }

  const apiUrl = 'https://app-8pj0bpgfx6v5-api-zYm4ze3j7XvL.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';
  
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: prompt
          }
        ]
      }
    ]
  };

  console.log('🔍 Iniciando busca web:', { query, context });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Gemini:', response.status, errorText);
      throw new Error(`API retornou erro: ${response.status}`);
    }

    // Processar resposta streaming
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    let fullText = '';
    let sources: Array<{ title: string; url: string }> = [];
    let searchQueries: string[] = [];
    let buffer = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.slice(6));
              
              // Extrair texto
              if (jsonData.candidates?.[0]?.content?.parts?.[0]?.text) {
                fullText += jsonData.candidates[0].content.parts[0].text;
              }

              // Extrair metadados de grounding (fontes)
              const groundingMetadata = jsonData.candidates?.[0]?.groundingMetadata;
              
              if (groundingMetadata) {
                // Extrair chunks (fontes)
                if (groundingMetadata.groundingChunks) {
                  for (const chunk of groundingMetadata.groundingChunks) {
                    if (chunk.web?.uri && chunk.web?.title) {
                      // Extrair URL real do redirect
                      let realUrl = chunk.web.uri;
                      try {
                        const url = new URL(chunk.web.uri);
                        const redirectParam = url.searchParams.get('url');
                        if (redirectParam) {
                          realUrl = decodeURIComponent(redirectParam);
                        }
                      } catch (e) {
                        // Manter URL original se falhar parse
                      }

                      sources.push({
                        title: chunk.web.title,
                        url: realUrl,
                      });
                    }
                  }
                }

                // Extrair queries de busca
                if (groundingMetadata.webSearchQueries) {
                  searchQueries = groundingMetadata.webSearchQueries;
                }
              }
            } catch (e) {
              // Ignorar linhas que não são JSON válido
              console.warn('Linha SSE não é JSON:', line);
            }
          }
        }
      }
    }

    // Remover duplicatas de fontes
    const uniqueSources = Array.from(
      new Map(sources.map(s => [s.url, s])).values()
    );

    console.log('✅ Busca concluída:', {
      textLength: fullText.length,
      sourcesCount: uniqueSources.length,
      searchQueries,
    });

    return {
      success: true,
      answer: fullText || 'Nenhuma informação encontrada.',
      sources: uniqueSources,
      searchQueries,
    };

  } catch (error) {
    console.error('❌ Erro ao buscar:', error);
    throw error;
  }
}

// Handler principal
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, context }: SearchRequest = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Query não fornecida',
        } as SearchResponse),
        {
          headers: corsHeaders,
          status: 400,
        }
      );
    }

    console.log('📥 Requisição de busca:', { query, context });

    // Realizar busca
    const result = await searchWithGemini(query, context);

    return new Response(
      JSON.stringify(result),
      {
        headers: corsHeaders,
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro no handler:', error);

    return new Response(
      JSON.stringify({
        success: false,
        answer: '',
        sources: [],
        searchQueries: [],
        error: error.message || 'Erro ao processar busca',
      } as SearchResponse),
      {
        headers: corsHeaders,
        status: 200, // Retornar 200 para não quebrar o fluxo
      }
    );
  }
});
