import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const PLACE_ID = 'ChIJkW1-ktLHyJQRyPqg9BtxflA';
    const CACHE_HOURS = 12;

    // Verificar se existe cache válido
    const { data: cachedData, error: cacheError } = await supabase
      .from('google_reviews_cache')
      .select('*')
      .eq('place_id', PLACE_ID)
      .order('cached_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cacheError && cachedData) {
      const cacheAge = Date.now() - new Date(cachedData.cached_at).getTime();
      const cacheAgeHours = cacheAge / (1000 * 60 * 60);

      // Se o cache ainda é válido, retornar dados em cache
      if (cacheAgeHours < CACHE_HOURS) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              rating: cachedData.rating,
              user_ratings_total: cachedData.user_ratings_total,
              reviews: cachedData.reviews,
            },
            cached: true,
            cache_age_hours: cacheAgeHours.toFixed(2),
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // Se não houver API key, retornar dados de exemplo
    if (!googleApiKey) {
      const exampleData = {
        rating: 4.8,
        user_ratings_total: 127,
        reviews: [
          {
            author_name: 'Carlos Silva',
            rating: 5,
            text: 'Excelente atendimento! Consertaram meu PlayStation 5 rapidamente e com preço justo. Recomendo!',
            time: Date.now() / 1000 - 86400 * 14,
            profile_photo_url: '',
          },
          {
            author_name: 'Maria Santos',
            rating: 5,
            text: 'Profissionais muito competentes. Recuperaram dados do meu notebook que outros disseram ser impossível. Muito obrigada!',
            time: Date.now() / 1000 - 86400 * 30,
            profile_photo_url: '',
          },
          {
            author_name: 'João Oliveira',
            rating: 5,
            text: 'Melhor assistência técnica de Campinas! Reparo de qualidade, atendimento transparente e preços honestos.',
            time: Date.now() / 1000 - 86400 * 21,
            profile_photo_url: '',
          },
          {
            author_name: 'Ana Paula',
            rating: 5,
            text: 'Consertaram meu notebook com perfeição. Ficou como novo! Atendimento rápido e profissional.',
            time: Date.now() / 1000 - 86400 * 7,
            profile_photo_url: '',
          },
          {
            author_name: 'Roberto Costa',
            rating: 5,
            text: 'Experiência incrível! Fizeram reballing na minha placa de vídeo e voltou a funcionar perfeitamente. Técnicos muito capacitados!',
            time: Date.now() / 1000 - 86400 * 60,
            profile_photo_url: '',
          },
        ],
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: exampleData,
          cached: false,
          note: 'Dados de exemplo - Configure GOOGLE_PLACES_API_KEY para usar dados reais',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Buscar dados do Google Places API
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=rating,user_ratings_total,reviews&key=${googleApiKey}&language=pt-BR`;

    const response = await fetch(placeDetailsUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google API Error: ${data.status}`);
    }

    const result = data.result;

    // Salvar no cache
    await supabase.from('google_reviews_cache').insert({
      place_id: PLACE_ID,
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      reviews: result.reviews || [],
      cached_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rating: result.rating,
          user_ratings_total: result.user_ratings_total,
          reviews: result.reviews || [],
        },
        cached: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching Google reviews:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});