import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RawReview = {
  author_name?: string;
  rating?: number;
  text?: string;
  time?: number;
  profile_photo_url?: string;
};

type CacheRow = {
  place_id: string;
  rating: number;
  user_ratings_total: number;
  reviews: RawReview[] | null;
  cached_at: string;
};

const normalizeReview = (review: RawReview) => ({
  author_name: String(review.author_name || 'Cliente').trim() || 'Cliente',
  rating: Number(review.rating || 0),
  text: String(review.text || ''),
  time: Number(review.time || 0),
  profile_photo_url: String(review.profile_photo_url || ''),
});

const consolidateReviews = (rows: CacheRow[]) => {
  const uniqueReviews = new Map<string, ReturnType<typeof normalizeReview>>();

  for (const row of rows) {
    const reviews = Array.isArray(row.reviews) ? row.reviews : [];

    for (const review of reviews) {
      const normalized = normalizeReview(review);
      const dedupeKey = `${normalized.author_name}|${normalized.time}|${normalized.rating}|${(normalized.text || '').slice(0, 40)}`;

      if (!uniqueReviews.has(dedupeKey)) {
        uniqueReviews.set(dedupeKey, normalized);
      }
    }
  }

  return Array.from(uniqueReviews.values())
    .sort((a, b) => b.time - a.time)
    .slice(0, 10);
};

Deno.serve(async (req) => {
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

    const { data: cachedRows, error: cacheError } = await supabase
      .from('google_reviews_cache')
      .select('*')
      .eq('place_id', PLACE_ID)
      .order('cached_at', { ascending: false })
      .limit(20);

    const cacheRows = !cacheError && Array.isArray(cachedRows) ? (cachedRows as CacheRow[]) : [];

    if (cacheRows.length > 0) {
      const latest = cacheRows[0];
      const ageHours = (Date.now() - new Date(latest.cached_at).getTime()) / (1000 * 60 * 60);
      const reviewsConsolidated = consolidateReviews(cacheRows);

      if (ageHours < CACHE_HOURS) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              rating: latest.rating,
              user_ratings_total: latest.user_ratings_total,
              reviews: reviewsConsolidated,
            },
            cached: true,
            cache_age_hours: Number(ageHours.toFixed(2)),
            cached_at: latest.cached_at,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

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

    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=rating,user_ratings_total,reviews&key=${googleApiKey}&language=pt-BR`;

    const response = await fetch(placeDetailsUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google API Error: ${data.status}`);
    }

    const result = data.result;
    const nowIso = new Date().toISOString();

    await supabase.from('google_reviews_cache').insert({
      place_id: PLACE_ID,
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      reviews: result.reviews || [],
      cached_at: nowIso,
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
        cached_at: nowIso,
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
