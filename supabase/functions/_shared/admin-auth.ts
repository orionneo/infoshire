import { createClient, type User } from 'jsr:@supabase/supabase-js@2';

export type AdminAuthResult =
  | { ok: true; user: User }
  | { ok: false; response: Response };

export const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: jsonResponse({ error: 'AutenticaÃ§Ã£o obrigatÃ³ria' }, 401, corsHeaders),
    };
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const token = authHeader.replace('Bearer ', '').trim();
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !userData.user) {
    return {
      ok: false,
      response: jsonResponse({ error: 'SessÃ£o invÃ¡lida ou expirada' }, 401, corsHeaders),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') {
    return {
      ok: false,
      response: jsonResponse({ error: 'Acesso negado' }, 403, corsHeaders),
    };
  }

  return { ok: true, user: userData.user };
}
