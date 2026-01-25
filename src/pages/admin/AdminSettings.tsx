import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, MessageSquare, CheckCircle, XCircle, DollarSign, Package, MapPin, Clock } from 'lucide-react';
import { getAllSystemSettings, updateSystemSetting } from '@/db/api';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // WhatsApp Templates
  const [templateCompleted, setTemplateCompleted] = useState('');
  const [templateNotApproved, setTemplateNotApproved] = useState('');
  const [templateBudgetApproved, setTemplateBudgetApproved] = useState('');
  const [templateBudgetRequest, setTemplateBudgetRequest] = useState('');
  const [templateReadyForPickup, setTemplateReadyForPickup] = useState('');
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  
  // Business Information
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await getAllSystemSettings();
      
      settings.forEach((setting: any) => {
        switch (setting.setting_key) {
          case 'whatsapp_template_order_completed':
            setTemplateCompleted(setting.setting_value);
            break;
          case 'whatsapp_template_not_approved':
            setTemplateNotApproved(setting.setting_value);
            break;
          case 'whatsapp_template_budget_approved':
            setTemplateBudgetApproved(setting.setting_value);
            break;
          case 'whatsapp_template_budget_request':
            setTemplateBudgetRequest(setting.setting_value);
            break;
          case 'whatsapp_template_ready_for_pickup':
            setTemplateReadyForPickup(setting.setting_value);
            break;
          case 'whatsapp_auto_send_on_completion':
            setAutoSendEnabled(setting.setting_value === 'true');
            break;
          case 'business_address':
            setBusinessAddress(setting.setting_value);
            break;
          case 'business_hours':
            setBusinessHours(setting.setting_value);
            break;
        }
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSystemSetting('whatsapp_template_order_completed', templateCompleted),
        updateSystemSetting('whatsapp_template_not_approved', templateNotApproved),
        updateSystemSetting('whatsapp_template_budget_approved', templateBudgetApproved),
        updateSystemSetting('whatsapp_template_budget_request', templateBudgetRequest),
        updateSystemSetting('whatsapp_template_ready_for_pickup', templateReadyForPickup),
        updateSystemSetting('whatsapp_auto_send_on_completion', autoSendEnabled ? 'true' : 'false'),
        updateSystemSetting('business_address', businessAddress),
        updateSystemSetting('business_hours', businessHours),
      ]);

      toast({
        title: 'Configurações salvas',
        description: 'As configurações foram atualizadas com sucesso',
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie templates de WhatsApp e outras configurações do sistema
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>

        {/* Auto Send Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Envio Automático de WhatsApp
            </CardTitle>
            <CardDescription>
              Habilitar ou desabilitar o envio automático de mensagens WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-send">Enviar automaticamente ao finalizar OS</Label>
                <p className="text-sm text-muted-foreground">
                  Quando habilitado, uma mensagem WhatsApp será enviada automaticamente quando uma OS for finalizada
                </p>
              </div>
              <Switch
                id="auto-send"
                checked={autoSendEnabled}
                onCheckedChange={setAutoSendEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Template: OS Finalizada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Template: OS Finalizada
            </CardTitle>
            <CardDescription>
              Mensagem enviada quando uma ordem de serviço é finalizada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-completed">Mensagem</Label>
              <Textarea
                id="template-completed"
                value={templateCompleted}
                onChange={(e) => setTemplateCompleted(e.target.value)}
                rows={15}
                className="font-mono text-sm"
                placeholder="Digite o template da mensagem..."
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Variáveis disponíveis:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'nome_cliente'}</code> - Nome do cliente</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'numero_os'}</code> - Número da OS</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'equipamento'}</code> - Nome do equipamento</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'data_conclusao'}</code> - Data de conclusão (formato: DD/MM/YYYY)</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'data_fim_garantia'}</code> - Data de fim da garantia (formato: DD/MM/YYYY)</li>
                </ul>
                <p className="mt-2 text-amber-600">
                  ⚠️ Use as variáveis entre chaves: {'{nome_cliente}'}, {'{numero_os}'}, etc.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template: Orçamento Não Aprovado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Template: Orçamento Não Aprovado
            </CardTitle>
            <CardDescription>
              Mensagem enviada quando um orçamento não é aprovado pelo cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-not-approved">Mensagem</Label>
              <Textarea
                id="template-not-approved"
                value={templateNotApproved}
                onChange={(e) => setTemplateNotApproved(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="Digite o template da mensagem..."
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Variáveis disponíveis:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'nome_cliente'}</code> - Nome do cliente</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'numero_os'}</code> - Número da OS</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'equipamento'}</code> - Nome do equipamento</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template: Orçamento Aprovado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Template: Orçamento Aprovado
            </CardTitle>
            <CardDescription>
              Mensagem enviada quando um orçamento é aprovado pelo cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-budget-approved">Mensagem</Label>
              <Textarea
                id="template-budget-approved"
                value={templateBudgetApproved}
                onChange={(e) => setTemplateBudgetApproved(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="Digite o template da mensagem..."
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Variáveis disponíveis:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'nome_cliente'}</code> - Nome do cliente</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'numero_os'}</code> - Número da OS</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'equipamento'}</code> - Nome do equipamento</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'valor_total'}</code> - Valor total do orçamento</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'data_estimada'}</code> - Data estimada de conclusão</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template: Envio de Orçamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              Template: Envio de Orçamento
            </CardTitle>
            <CardDescription>
              Mensagem enviada ao cliente quando um novo orçamento é disponibilizado para aprovação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-budget-request">Mensagem</Label>
              <Textarea
                id="template-budget-request"
                value={templateBudgetRequest}
                onChange={(e) => setTemplateBudgetRequest(e.target.value)}
                rows={15}
                className="font-mono text-sm"
                placeholder="Digite o template da mensagem..."
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Variáveis disponíveis:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'nome_cliente'}</code> - Nome do cliente</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'numero_os'}</code> - Número da OS</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'equipamento'}</code> - Nome do equipamento</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'valor_mao_obra'}</code> - Valor da mão de obra</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'valor_pecas'}</code> - Valor das peças</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'valor_total'}</code> - Valor total do orçamento</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'observacoes'}</code> - Observações do orçamento (se houver)</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'link_aprovacao'}</code> - Link para aprovação do orçamento</li>
                </ul>
                <p className="mt-2 text-amber-600">
                  ⚠️ Use as variáveis entre chaves: {'{nome_cliente}'}, {'{numero_os}'}, etc.
                </p>
                <p className="mt-2 text-blue-600">
                  💡 Dica: Adicione informações sobre formas de pagamento, parcelamento com cartões, etc.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template: Equipamento Pronto para Retirada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Template: Equipamento Pronto para Retirada
            </CardTitle>
            <CardDescription>
              Mensagem enviada ao cliente quando o equipamento está pronto para ser retirado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-ready-pickup">Mensagem</Label>
              <Textarea
                id="template-ready-pickup"
                value={templateReadyForPickup}
                onChange={(e) => setTemplateReadyForPickup(e.target.value)}
                rows={18}
                className="font-mono text-sm"
                placeholder="Digite o template da mensagem..."
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Variáveis disponíveis:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'nome_cliente'}</code> ou <code className="bg-muted px-1 py-0.5 rounded">{'cliente_nome'}</code> - Nome do cliente</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'numero_os'}</code> - Número da OS</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'equipamento'}</code> - Nome do equipamento</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'endereco'}</code> - Endereço para retirada</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'horario'}</code> - Horário de atendimento</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'valor_total'}</code> - Valor total (formatado)</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'desconto'}</code> - Desconto aplicado (se houver)</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'valor_final'}</code> - Valor final com desconto (se houver)</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'observacoes'}</code> - Observações (se houver)</li>
                </ul>
                <p className="mt-2 text-amber-600">
                  ⚠️ Use as variáveis entre chaves: {'{nome_cliente}'}, {'{endereco}'}, etc.
                </p>
                <p className="mt-2 text-blue-600">
                  💡 Dica: Configure o endereço e horário nos campos abaixo para que apareçam automaticamente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Negócio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Informações do Estabelecimento
            </CardTitle>
            <CardDescription>
              Endereço e horário de funcionamento usados nos templates de WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-address">Endereço Completo</Label>
              <Textarea
                id="business-address"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                rows={3}
                placeholder="Rua Exemplo, 123 - Centro&#10;CEP: 12345-678 - Cidade/UF"
              />
              <p className="text-xs text-muted-foreground">
                Este endereço será usado na variável {'{endereco}'} dos templates
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business-hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário de Funcionamento
              </Label>
              <Textarea
                id="business-hours"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                rows={3}
                placeholder="Segunda a Sexta: 9h às 18h&#10;Sábado: 9h às 13h&#10;Domingo: Fechado"
              />
              <p className="text-xs text-muted-foreground">
                Este horário será usado na variável {'{horario}'} dos templates
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button (Bottom) */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
