import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WarrantyExpiredOrder {
  id: string;
  order_number: string;
  client_id: string;
  equipment: string;
  serial_number: string | null;
  data_fim_garantia: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
}

interface WarrantyExpiringSoon {
  id: string;
  order_number: string;
  client_id: string;
  equipment: string;
  serial_number: string | null;
  data_fim_garantia: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  dias_restantes: number;
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

    console.log("🔄 Iniciando verificação diária de garantias...");

    // 1. Atualizar status de garantias expiradas (em_garantia = false)
    const { data: expiredWarranties, error: updateError } = await supabaseClient
      .from("service_orders")
      .update({ em_garantia: false })
      .eq("em_garantia", true)
      .lt("data_fim_garantia", new Date().toISOString())
      .select(`
        id,
        order_number,
        client_id,
        equipment,
        serial_number,
        data_fim_garantia,
        client:profiles!client_id(name, email, phone)
      `);

    if (updateError) {
      console.error("❌ Erro ao atualizar garantias expiradas:", updateError);
    } else {
      console.log(`✅ ${expiredWarranties?.length || 0} garantias expiradas atualizadas`);
    }

    // 2. Buscar garantias que expirarão nos próximos 7 dias
    const { data: expiringSoon, error: expiringSoonError } = await supabaseClient
      .from("warranties_expiring_soon")
      .select("*");

    if (expiringSoonError) {
      console.error("❌ Erro ao buscar garantias expirando:", expiringSoonError);
    } else {
      console.log(`📋 ${expiringSoon?.length || 0} garantias expirarão nos próximos 7 dias`);
    }

    // 3. Enviar notificação via Telegram se houver garantias expiradas ou expirando
    const shouldNotify = (expiredWarranties && expiredWarranties.length > 0) || 
                         (expiringSoon && expiringSoon.length > 0);

    if (shouldNotify) {
      // Buscar configurações do Telegram
      const { data: settings, error: settingsError } = await supabaseClient
        .from("site_settings")
        .select("telegram_chat_id, telegram_notifications_enabled")
        .limit(1)
        .maybeSingle();

      if (settingsError) {
        console.error("❌ Erro ao buscar configurações:", settingsError);
      } else if (settings?.telegram_notifications_enabled && settings?.telegram_chat_id) {
        const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        
        if (telegramBotToken) {
          // Construir mensagem
          let message = "📊 *RELATÓRIO DIÁRIO DE GARANTIAS*\n\n";

          // Garantias expiradas hoje
          if (expiredWarranties && expiredWarranties.length > 0) {
            message += `❌ *${expiredWarranties.length} Garantia(s) Expirada(s) Hoje:*\n\n`;
            
            for (const order of expiredWarranties) {
              const client = Array.isArray(order.client) ? order.client[0] : order.client;
              message += `📋 OS #${order.order_number}\n`;
              message += `👤 Cliente: ${client?.name || 'N/A'}\n`;
              message += `🔧 Equipamento: ${order.equipment}\n`;
              if (order.serial_number) {
                message += `🏷️ Série: ${order.serial_number}\n`;
              }
              message += `📅 Garantia expirou: ${new Date(order.data_fim_garantia).toLocaleDateString('pt-BR')}\n`;
              message += `\n`;
            }
          }

          // Garantias expirando em breve
          if (expiringSoon && expiringSoon.length > 0) {
            message += `⚠️ *${expiringSoon.length} Garantia(s) Expirando nos Próximos 7 Dias:*\n\n`;
            
            for (const warranty of expiringSoon) {
              message += `📋 OS #${warranty.order_number}\n`;
              message += `👤 Cliente: ${warranty.client_name || 'N/A'}\n`;
              message += `🔧 Equipamento: ${warranty.equipment}\n`;
              if (warranty.serial_number) {
                message += `🏷️ Série: ${warranty.serial_number}\n`;
              }
              message += `⏰ Expira em: ${warranty.dias_restantes} dia(s)\n`;
              message += `📅 Data de expiração: ${new Date(warranty.data_fim_garantia).toLocaleDateString('pt-BR')}\n`;
              message += `\n`;
            }
          }

          message += `\n🕐 Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`;

          // Enviar mensagem via Telegram
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

          if (telegramResponse.ok) {
            console.log("✅ Notificação Telegram enviada com sucesso!");
          } else {
            console.error("❌ Erro ao enviar notificação Telegram:", telegramData);
          }
        } else {
          console.log("⚠️ TELEGRAM_BOT_TOKEN não configurado");
        }
      } else {
        console.log("⚠️ Notificações do Telegram desabilitadas ou Chat ID não configurado");
      }
    } else {
      console.log("✅ Nenhuma garantia expirada ou expirando em breve");
    }

    // Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        message: "Verificação de garantias concluída",
        expired_count: expiredWarranties?.length || 0,
        expiring_soon_count: expiringSoon?.length || 0,
        expired_warranties: expiredWarranties || [],
        expiring_soon: expiringSoon || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Erro na verificação de garantias:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
