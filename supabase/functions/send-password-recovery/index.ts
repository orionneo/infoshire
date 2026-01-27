import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const safeResponse = () =>
    new Response(
      JSON.stringify({
        message: "Se o e-mail existir, enviaremos um link de recuperação.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );

  if (req.method !== "POST") {
    return safeResponse();
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : undefined;

    if (!email) {
      return safeResponse();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "";

    let actionLink: string | null = null;

    if (supabaseUrl && serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });

      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (error) {
        console.log("generateLink failed", error.message);
      } else {
        actionLink = data?.properties?.action_link ?? null;
      }
    } else {
      console.log("Missing Supabase env for recovery link generation");
    }

    if (actionLink && resendApiKey && resendFromEmail) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [email],
          subject: "Recuperação de senha - InfoShire",
          html: `
            <div style="font-family: sans-serif; line-height: 1.5;">
              <p>Recebemos um pedido para redefinir sua senha.</p>
              <p>Para criar uma nova senha, clique no botão abaixo:</p>
              <p>
                <a
                  href="${actionLink}"
                  style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;"
                >
                  Redefinir senha
                </a>
              </p>
              <p>Se você não solicitou a redefinição, ignore este e-mail.</p>
            </div>
          `,
        }),
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        console.log("Resend API error", errorText);
      }
    } else {
      console.log("Missing Resend env or action link");
    }
  } catch (error) {
    console.log("send-password-recovery error", error instanceof Error ? error.message : String(error));
  }

  return safeResponse();
});
