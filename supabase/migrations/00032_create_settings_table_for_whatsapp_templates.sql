-- Criar tabela de configurações do sistema
-- Migration: 00032_create_settings_table_for_whatsapp_templates.sql
-- Descrição: Tabela para armazenar configurações do sistema, incluindo templates de WhatsApp

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  setting_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar comentários
COMMENT ON TABLE public.system_settings IS 'Tabela de configurações do sistema';
COMMENT ON COLUMN public.system_settings.setting_key IS 'Chave única da configuração';
COMMENT ON COLUMN public.system_settings.setting_value IS 'Valor da configuração (pode ser JSON, texto, etc)';
COMMENT ON COLUMN public.system_settings.setting_description IS 'Descrição da configuração';

-- Criar índice para busca rápida por chave
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);

-- Inserir template padrão de WhatsApp para OS finalizada
INSERT INTO public.system_settings (setting_key, setting_value, setting_description)
VALUES (
  'whatsapp_template_order_completed',
  '✅ Ordem de Serviço Finalizada

Olá, {nome_cliente}! Aqui é da Infoshire Eletrônica e Games 👋

Agradecemos a sua confiança em realizar o serviço conosco!

Informamos que a sua Ordem de Serviço nº {numero_os}, referente ao equipamento {equipamento}, foi concluída com sucesso nesta data ({data_conclusao}).

Você conta com garantia de 90 dias sobre o serviço executado, válida até {data_fim_garantia}.

⚙️ Esta garantia cobre exclusivamente o serviço realizado. Ela deixa de ser aplicável em casos de mau uso, quedas, impactos (mesmo acidentais), acidentes, derramamento de líquidos, choques elétricos, picos ou quedas de tensão, ou eventos atmosféricos.

Qualquer dúvida, estamos à disposição pelo WhatsApp ou presencialmente na loja.

👨‍🔧 Infoshire Eletrônica e Games  
Assistência Técnica e Games',
  'Template de mensagem WhatsApp enviada quando uma OS é finalizada'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Inserir configuração para habilitar/desabilitar envio automático
INSERT INTO public.system_settings (setting_key, setting_value, setting_description)
VALUES (
  'whatsapp_auto_send_on_completion',
  'true',
  'Habilitar envio automático de WhatsApp quando OS for finalizada'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Inserir template de WhatsApp para orçamento não aprovado
INSERT INTO public.system_settings (setting_key, setting_value, setting_description)
VALUES (
  'whatsapp_template_not_approved',
  '❌ Orçamento Não Aprovado

Olá, {nome_cliente}! Aqui é da Infoshire Eletrônica e Games 👋

Recebemos a informação de que o orçamento da Ordem de Serviço nº {numero_os}, referente ao equipamento {equipamento}, não foi aprovado.

O equipamento está disponível para retirada em nossa loja no prazo de 7 dias corridos.

⚠️ Importante: Após este prazo, será cobrada uma taxa de armazenamento de R$ 20,00 por dia.

Qualquer dúvida, estamos à disposição pelo WhatsApp ou presencialmente na loja.

👨‍🔧 Infoshire Eletrônica e Games  
Assistência Técnica e Games',
  'Template de mensagem WhatsApp enviada quando orçamento não é aprovado'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Inserir template de WhatsApp para orçamento aprovado
INSERT INTO public.system_settings (setting_key, setting_value, setting_description)
VALUES (
  'whatsapp_template_budget_approved',
  '✅ Orçamento Aprovado

Olá, {nome_cliente}! Aqui é da Infoshire Eletrônica e Games 👋

Recebemos a aprovação do orçamento da Ordem de Serviço nº {numero_os}, referente ao equipamento {equipamento}.

Valor aprovado: R$ {valor_total}

Já iniciamos o reparo do seu equipamento. Você será notificado assim que o serviço for concluído.

Previsão de conclusão: {data_estimada}

Qualquer dúvida, estamos à disposição pelo WhatsApp ou presencialmente na loja.

👨‍🔧 Infoshire Eletrônica e Games  
Assistência Técnica e Games',
  'Template de mensagem WhatsApp enviada quando orçamento é aprovado'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trigger_update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ler configurações
CREATE POLICY "Admins can read settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Apenas admins podem atualizar configurações
CREATE POLICY "Admins can update settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Apenas admins podem inserir configurações
CREATE POLICY "Admins can insert settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );