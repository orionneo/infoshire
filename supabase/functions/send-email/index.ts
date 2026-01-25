import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to send email via Resend
async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar via Resend: ${error}`);
  }

  return await response.json();
}

// Helper function to send email via SMTP
async function sendViaSMTP(config: any, password: string, to: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: config.smtp_host,
      port: config.smtp_port,
      tls: !config.smtp_secure,
      auth: {
        username: config.smtp_user,
        password: password,
      },
    },
  });

  await client.send({
    from: `${config.from_name} <${config.from_email}>`,
    to: to,
    subject: subject,
    content: 'auto',
    html: html,
  });

  await client.close();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Apenas administradores podem enviar emails');
    }

    // Get email config from database
    const { data: emailConfig, error: configError } = await supabaseClient
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !emailConfig) {
      throw new Error('Configuração de email não encontrada. Configure em Admin > Config. Email');
    }

    // Get request body
    const { to, subject, html, isTest } = await req.json();

    if (!to || !subject || !html) {
      throw new Error('Destinatário, assunto e corpo do email são obrigatórios');
    }

    // Send email based on provider
    if (emailConfig.provider === 'resend') {
      // Use Resend API
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        throw new Error('Chave API do Resend não configurada. Configure a variável RESEND_API_KEY no Supabase ou mude para SMTP.');
      }

      const fromEmail = emailConfig.resend_from_email || 'onboarding@resend.dev';
      const fromName = emailConfig.from_name || 'InfoShire';
      const from = `${fromName} <${fromEmail}>`;

      await sendViaResend(resendApiKey, from, to, subject, html);
    } else {
      // Use SMTP
      const smtpPassword = Deno.env.get('SMTP_PASSWORD');
      if (!smtpPassword) {
        throw new Error('Senha SMTP não configurada. Configure a variável SMTP_PASSWORD no Supabase ou mude para Resend.');
      }

      if (!emailConfig.smtp_host || !emailConfig.smtp_user || !emailConfig.from_email) {
        throw new Error('Configuração SMTP incompleta. Preencha todos os campos SMTP ou mude para Resend.');
      }

      await sendViaSMTP(emailConfig, smtpPassword, to, subject, html);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: isTest ? 'Email de teste enviado com sucesso!' : 'Email enviado com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao enviar email',
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
