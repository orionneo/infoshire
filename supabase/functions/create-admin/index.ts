import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { requireAdmin } from '../_shared/admin-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bootstrap-token',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bootstrapToken = Deno.env.get('INFOSHIRE_ADMIN_BOOTSTRAP_TOKEN');
    const requestedBootstrapToken = req.headers.get('x-bootstrap-token');
    const initialAdminEmail = Deno.env.get('INFOSHIRE_INITIAL_ADMIN_EMAIL') ?? 'admin@miaoda.com';
    const initialAdminPassword = Deno.env.get('INFOSHIRE_INITIAL_ADMIN_PASSWORD');

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

    const { count: adminCount, error: adminCountError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (adminCountError) {
      throw adminCountError;
    }

    const adminExists = (adminCount ?? 0) > 0;

    if (adminExists) {
      const adminAuth = await requireAdmin(req, corsHeaders);
      if (!adminAuth.ok) return adminAuth.response;
    } else if (!bootstrapToken || requestedBootstrapToken !== bootstrapToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bootstrap administrativo bloqueado. Configure e envie um token de inicializaÃ§Ã£o vÃ¡lido.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        },
      );
    }

    if (!initialAdminPassword || initialAdminPassword.length < 12) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Senha inicial ausente ou insegura. Configure INFOSHIRE_INITIAL_ADMIN_PASSWORD com pelo menos 12 caracteres.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      );
    }

    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const adminEmailExists = existingUser?.users?.some((user) => user.email === initialAdminEmail);

    if (adminEmailExists) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'UsuÃ¡rio admin jÃ¡ existe',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: initialAdminEmail,
      password: initialAdminPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Administrador',
      },
    });

    if (createError) {
      throw createError;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'admin',
        name: 'Administrador',
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      throw profileError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'UsuÃ¡rio admin criado com sucesso',
        email: initialAdminEmail,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
