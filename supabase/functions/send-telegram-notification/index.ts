import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TelegramNotificationRequest {
  orderNumber?: string;
  equipment?: string;
  clientName?: string;
  totalCost?: number;
  laborCost?: number;
  partsCost?: number;
  requestedDate?: string;
  requestedTime?: string;
  notificationType: 'approved' | 'not_approved' | 'appointment_requested';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get request body
    const body: TelegramNotificationRequest = await req.json();
    const {
      orderNumber,
      equipment,
      clientName,
      totalCost,
      laborCost,
      partsCost,
      requestedDate,
      requestedTime,
      notificationType,
    } = body;

    // Get Telegram settings from database
    const { data: settings, error: settingsError } = await supabaseClient
      .from("site_settings")
      .select("telegram_chat_id, telegram_notifications_enabled")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar configurações" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if Telegram notifications are enabled
    if (!settings?.telegram_notifications_enabled) {
      return new Response(
        JSON.stringify({ message: "Notificações do Telegram desabilitadas" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!settings?.telegram_chat_id) {
      return new Response(
        JSON.stringify({ error: "Chat ID do Telegram não configurado" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Telegram Bot Token from secrets
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!telegramBotToken) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Token do bot não configurado" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format message based on notification type
    let message = '';
    
    if (notificationType === 'appointment_requested') {
      message = `
📆 *NOVO AGENDAMENTO SOLICITADO*

👤 *Cliente:* ${clientName || 'Cliente'}
🔧 *Equipamento:* ${equipment || 'Não informado'}
🗓️ *Data:* ${requestedDate || 'A definir'}
⏰ *Horário:* ${requestedTime || 'A definir'}
      `.trim();
    } else if (notificationType === 'not_approved') {
      message = `
❌ *ORÇAMENTO NÃO APROVADO*

📋 *OS:* #${orderNumber}
👤 *Cliente:* ${clientName}
🔧 *Equipamento:* ${equipment}

⚠️ O cliente não aprovou o orçamento.
📦 Equipamento deve ser retirado em até 7 dias.
💰 Após 7 dias: taxa de R$ 20,00/dia por armazenamento.
      `.trim();
    } else {
      // Original approved message
      message = `
🎉 *ORÇAMENTO APROVADO!*

📋 *OS:* #${orderNumber}
👤 *Cliente:* ${clientName}
🔧 *Equipamento:* ${equipment}

💰 *Valores:*
• Mão de Obra: R$ ${(laborCost || 0).toFixed(2).replace(".", ",")}
• Peças: R$ ${(partsCost || 0).toFixed(2).replace(".", ",")}
• *Total: R$ ${(totalCost || 0).toFixed(2).replace(".", ",")}*

✅ O cliente aprovou o orçamento e o reparo pode ser iniciado!
      `.trim();
    }

    // Send message via Telegram Bot API
    const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const telegramResponse = await fetch(telegramApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: settings.telegram_chat_id,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error("Telegram API error:", telegramData);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar mensagem no Telegram", details: telegramData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notificação enviada com sucesso!" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-telegram-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
