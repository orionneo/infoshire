-- Migration: 00038_add_pickup_template_and_business_info.sql
-- Descrição: Adicionar template de equipamento pronto para retirada e informações do negócio (endereço e horário)

-- Inserir template padrão para equipamento pronto para retirada
INSERT INTO public.system_settings (setting_key, setting_value, setting_description)
VALUES (
  'whatsapp_template_ready_for_pickup',
  '✅ *EQUIPAMENTO PRONTO PARA RETIRADA*

Olá {nome_cliente}!

Temos uma ótima notícia! Seu equipamento *{equipamento}* (OS #{numero_os}) está pronto para ser retirado! 🎉

📍 *Endereço para retirada:*
{endereco}

🕐 *Horário de atendimento:*
{horario}

{valor_total}{desconto}{valor_final}
{observacoes}Aguardamos você! 😊',
  'Template de mensagem WhatsApp enviada ao cliente quando o equipamento está pronto para retirada'
),
(
  'business_address',
  'Rua Exemplo, 123 - Centro
CEP: 12345-678 - Cidade/UF',
  'Endereço completo do estabelecimento para retirada de equipamentos'
),
(
  'business_hours',
  'Segunda a Sexta: 9h às 18h
Sábado: 9h às 13h
Domingo: Fechado',
  'Horário de funcionamento do estabelecimento'
)
ON CONFLICT (setting_key) DO UPDATE
SET 
  setting_value = EXCLUDED.setting_value,
  setting_description = EXCLUDED.setting_description,
  updated_at = now();