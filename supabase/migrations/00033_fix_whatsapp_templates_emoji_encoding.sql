-- Migration: 00033_fix_whatsapp_templates_emoji_encoding.sql
-- Descrição: Corrigir encoding de emojis nos templates WhatsApp e garantir UTF-8

-- Atualizar template de OS finalizada com emojis corretos
UPDATE public.system_settings
SET setting_value = '✅ Ordem de Serviço Finalizada

Olá, {nome_cliente}! Aqui é da Infoshire Eletrônica e Games 👋

Agradecemos a sua confiança em realizar o serviço conosco!

Informamos que a sua Ordem de Serviço nº {numero_os}, referente ao equipamento {equipamento}, foi concluída com sucesso nesta data ({data_conclusao}).

Você conta com garantia de 90 dias sobre o serviço executado, válida até {data_fim_garantia}.

⚙️ Esta garantia cobre exclusivamente o serviço realizado. Ela deixa de ser aplicável em casos de mau uso, quedas, impactos (mesmo acidentais), acidentes, derramamento de líquidos, choques elétricos, picos ou quedas de tensão, ou eventos atmosféricos.

Qualquer dúvida, estamos à disposição pelo WhatsApp ou presencialmente na loja.

👨‍🔧 Infoshire Eletrônica e Games  
Assistência Técnica e Games'
WHERE setting_key = 'whatsapp_template_order_completed';

-- Atualizar template de orçamento não aprovado
UPDATE public.system_settings
SET setting_value = '❌ Orçamento Não Aprovado

Olá, {nome_cliente}! Aqui é da Infoshire Eletrônica e Games 👋

Recebemos a informação de que o orçamento da Ordem de Serviço nº {numero_os}, referente ao equipamento {equipamento}, não foi aprovado.

O equipamento está disponível para retirada em nossa loja no prazo de 7 dias corridos.

⚠️ Importante: Após este prazo, será cobrada uma taxa de armazenamento de R$ 20,00 por dia.

Qualquer dúvida, estamos à disposição pelo WhatsApp ou presencialmente na loja.

👨‍🔧 Infoshire Eletrônica e Games  
Assistência Técnica e Games'
WHERE setting_key = 'whatsapp_template_not_approved';

-- Atualizar template de orçamento aprovado
UPDATE public.system_settings
SET setting_value = '✅ Orçamento Aprovado

Olá, {nome_cliente}! Aqui é da Infoshire Eletrônica e Games 👋

Recebemos a aprovação do orçamento da Ordem de Serviço nº {numero_os}, referente ao equipamento {equipamento}.

Valor aprovado: R$ {valor_total}

Já iniciamos o reparo do seu equipamento. Você será notificado assim que o serviço for concluído.

Previsão de conclusão: {data_estimada}

Qualquer dúvida, estamos à disposição pelo WhatsApp ou presencialmente na loja.

👨‍🔧 Infoshire Eletrônica e Games  
Assistência Técnica e Games'
WHERE setting_key = 'whatsapp_template_budget_approved';