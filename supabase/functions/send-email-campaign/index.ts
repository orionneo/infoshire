import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper function to send email via Resend
async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string
) {
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
      text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar via Resend: ${error}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const { subject, body, recipientIds, imageUrl } = await req.json();

    if (!subject || !body || !recipientIds || recipientIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Assunto, corpo e destinatários são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem enviar campanhas.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get recipient emails
    const { data: recipients, error: recipientsError } = await supabase
      .from('profiles')
      .select('email, name')
      .in('id', recipientIds);

    if (recipientsError || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum destinatário válido encontrado' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get email config from database
    const { data: emailConfig, error: configError } = await supabase
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !emailConfig) {
      return new Response(
        JSON.stringify({ 
          error: 'Configuração de email não encontrada. Configure em Admin > Config. Email' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send emails based on provider
    let results;
    
    if (emailConfig.provider === 'resend') {
      // Use Resend API
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        return new Response(
          JSON.stringify({ 
            error: 'Chave API do Resend não configurada. Configure a variável RESEND_API_KEY no Supabase ou mude para SMTP.' 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const fromEmail = emailConfig.resend_from_email || 'onboarding@resend.dev';
      const fromName = emailConfig.from_name || 'InfoShire';
      const from = `${fromName} <${fromEmail}>`;

      // Send emails using Resend
      const emailPromises = recipients.map(async (recipient) => {
        if (!recipient.email) return null;

        try {
          const promoImage = imageUrl
            ? `
              <img
                src="${imageUrl}"
                alt="Imagem promocional"
                style="max-width: 100%; height: auto; border-radius: 6px; margin-bottom: 20px;"
              />
            `
            : '';
          const htmlBody = body.replace(/\n/g, '<br>');
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${promoImage}
              <h2 style="color: #333;">Olá ${recipient.name || 'Cliente'},</h2>
              <div style="margin: 20px 0; line-height: 1.6;">
                ${htmlBody}
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">
                Esta é uma mensagem promocional de ${fromName}.
              </p>
            </div>
          `;
          const text = imageUrl
            ? `Imagem promocional: ${imageUrl}\n\n${body}`
            : body;

          await sendViaResend(resendApiKey, from, recipient.email, subject, html, text);
          return { email: recipient.email, success: true };
        } catch (error) {
          console.error(`Error sending email to ${recipient.email}:`, error);
          return { email: recipient.email, success: false, error: error.message };
        }
      });

      results = await Promise.all(emailPromises);
    } else {
      // Use SMTP
      const smtpPassword = Deno.env.get('SMTP_PASSWORD');
      if (!smtpPassword) {
        return new Response(
          JSON.stringify({ 
            error: 'Senha SMTP não configurada. Configure a variável SMTP_PASSWORD no Supabase ou mude para Resend.' 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!emailConfig.smtp_host || !emailConfig.smtp_user || !emailConfig.from_email) {
        return new Response(
          JSON.stringify({ 
            error: 'Configuração SMTP incompleta. Preencha todos os campos SMTP ou mude para Resend.' 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Create SMTP client
      const client = new SMTPClient({
        connection: {
          hostname: emailConfig.smtp_host,
          port: emailConfig.smtp_port,
          tls: !emailConfig.smtp_secure,
          auth: {
            username: emailConfig.smtp_user,
            password: smtpPassword,
          },
        },
      });

      // Send emails using SMTP
      const emailPromises = recipients.map(async (recipient) => {
        if (!recipient.email) return null;

        try {
          const promoImage = imageUrl
            ? `
              <img
                src="${imageUrl}"
                alt="Imagem promocional"
                style="max-width: 100%; height: auto; border-radius: 6px; margin-bottom: 20px;"
              />
            `
            : '';
          const htmlBody = body.replace(/\n/g, '<br>');
          const text = imageUrl
            ? `Imagem promocional: ${imageUrl}\n\n${body}`
            : body;
          await client.send({
            from: `${emailConfig.from_name} <${emailConfig.from_email}>`,
            to: recipient.email,
            subject: subject,
            content: 'auto',
            text,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                ${promoImage}
                <h2 style="color: #333;">Olá ${recipient.name || 'Cliente'},</h2>
                <div style="margin: 20px 0; line-height: 1.6;">
                  ${htmlBody}
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">
                  Esta é uma mensagem promocional de ${emailConfig.from_name}.
                </p>
              </div>
            `,
          });

          return { email: recipient.email, success: true };
        } catch (error) {
          console.error(`Error sending email to ${recipient.email}:`, error);
          return { email: recipient.email, success: false, error: error.message };
        }
      });

      results = await Promise.all(emailPromises);
      
      // Close SMTP connection
      await client.close();
    }

    const successCount = results.filter(r => r?.success).length;

    // Save campaign to database
    const { error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        subject,
        body,
        recipients_count: successCount,
        sent_by: user.id,
      });

    if (campaignError) {
      console.error('Error saving campaign:', campaignError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Campanha enviada com sucesso para ${successCount} de ${recipients.length} destinatários`,
        results: results.filter(r => r !== null),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-email-campaign function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
