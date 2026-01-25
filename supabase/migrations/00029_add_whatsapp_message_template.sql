-- Add WhatsApp message template setting
INSERT INTO public.site_settings (key, value) 
VALUES (
  'whatsapp_pickup_template',
  '"Olá {{cliente_nome}}! \n\nTemos uma ótima notícia! Seu equipamento *{{equipamento}}* (OS #{{numero_os}}) está pronto para ser retirado! 🎉\n\n📍 *Endereço para retirada:*\n[Seu endereço aqui]\n\n🕐 *Horário de atendimento:*\n[Seu horário aqui]\n\n{{valor_total}}\n{{desconto}}\n{{valor_final}}\n\n{{observacoes}}Aguardamos você! 😊"'::jsonb
)
ON CONFLICT (key) DO NOTHING;