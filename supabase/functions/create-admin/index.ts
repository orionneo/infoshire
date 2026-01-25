import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if admin user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUser?.users?.some(u => u.email === 'admin@miaoda.com');

    if (adminExists) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Usuário admin já existe' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Create admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@miaoda.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        name: 'Administrador',
      },
    });

    if (createError) {
      throw createError;
    }

    // Update profile to admin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: 'admin',
        name: 'Administrador'
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      throw profileError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário admin criado com sucesso',
        username: 'admin',
        password: 'admin123'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
