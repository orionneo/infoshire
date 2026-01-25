-- Migration: 00039_add_not_approved_template_and_fix_defaults.sql
-- Descrição: Adicionar template de orçamento não aprovado e corrigir endereços padrão

-- Inserir template para orçamento não aprovado
INSERT INTO public.system_settings (setting_key, setting_value, setting_description)
VALUES (
  'whatsapp_template_not_approved',
  '❌ *ORÇAMENTO NÃO APROVADO*

Olá {cliente_nome}!

Lamentamos que você não aprovou o orçamento que enviamos para o equipamento *{equipamento}* (OS #{numero_os}).

⚠️ *IMPORTANTE - Retirada do Equipamento:*
📦 Seu equipamento deve ser retirado em até *7 dias corridos*.
💰 Após este prazo, será cobrada uma taxa de *R$ 20,00 por dia* de armazenamento e conservação.

📍 *Endereço para retirada:*
{endereco}

🕐 *Horário de atendimento:*
{horario}

{observacoes}Aguardamos você para a retirada do equipamento.',
  'Template de mensagem WhatsApp enviada ao cliente quando o orçamento não é aprovado'
)
ON CONFLICT (setting_key) DO UPDATE
SET 
  setting_value = EXCLUDED.setting_value,
  setting_description = EXCLUDED.setting_description,
  updated_at = now();

-- Atualizar template de equipamento pronto para retirada (remover endereço hardcoded do fallback)
UPDATE public.system_settings
SET 
  setting_value = 'Olá {cliente_nome}! 

Temos uma ótima notícia! Seu equipamento *{equipamento}* (OS #{numero_os}) está pronto para ser retirado! 🎉

🧭 Como chegar:
{endereco}

🕒 Horário de atendimento:
{horario}

⚠️ Atenção: o prazo para retirada é de até 7 dias. Após esse período, será cobrada uma taxa de armazenamento e conservação no valor de R$ 20,00 por dia.

{valor_total}{desconto}{valor_final}
{observacoes}Ficamos à disposição para qualquer dúvida. Aguardamos você!',
  updated_at = now()
WHERE setting_key = 'whatsapp_template_ready_for_pickup';

-- Comentário: O administrador DEVE configurar o endereço e horário corretos em Admin > Configurações > WhatsApp
-- Os valores padrão "Rua Exemplo..." são apenas placeholders e devem ser substituídos