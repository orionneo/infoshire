-- Migration: 00037_add_whatsapp_budget_request_template.sql
-- Descrição: Adicionar template editável para mensagem de envio de orçamento via WhatsApp

-- Inserir template padrão para envio de orçamento
INSERT INTO public.system_settings (setting_key, setting_value, setting_description)
VALUES (
  'whatsapp_template_budget_request',
  'Olá {nome_cliente}! 

Seu orçamento para o reparo do equipamento *{equipamento}* (OS #{numero_os}) está pronto:

💰 *Valor da mão de obra:* R$ {valor_mao_obra}
🔧 *Valor das peças:* R$ {valor_pecas}
📊 *Valor total:* R$ {valor_total}

{observacoes}✅ *Para aprovar o orçamento, clique no link:*
{link_aprovacao}

💳 *Formas de pagamento:*
• Dinheiro
• PIX
• Cartão de crédito (parcelamento disponível)
• Cartão de débito

Aguardamos sua aprovação para iniciar o reparo! 🔧',
  'Template de mensagem WhatsApp enviada ao cliente quando um novo orçamento é disponibilizado'
)
ON CONFLICT (setting_key) DO UPDATE
SET 
  setting_value = EXCLUDED.setting_value,
  setting_description = EXCLUDED.setting_description,
  updated_at = now();