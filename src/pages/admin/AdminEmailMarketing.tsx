import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, Check, Loader2, Mail, Send, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllProfiles, getEmailCampaigns, sendEmailCampaign } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import type { EmailCampaignWithSender, Profile } from '@/types/types';

export default function AdminEmailMarketing() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Profile[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaignWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectAll) {
      setSelectedClients(clients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  }, [selectAll, clients]);

  const loadData = async () => {
    try {
      const [profilesData, campaignsData] = await Promise.all([
        getAllProfiles(),
        getEmailCampaigns(),
      ]);
      
      const clientsOnly = profilesData.filter(p => p.role === 'client' && p.email);
      setClients(clientsOnly);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      }
      return [...prev, clientId];
    });
  };

  const handleSendCampaign = async () => {
    const trimmedImageUrl = imageUrl.trim();
    if (!subject.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha o assunto do email',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedImageUrl && !/^https?:\/\//i.test(trimmedImageUrl)) {
      toast({
        title: 'Erro',
        description: 'A imagem promocional deve começar com http:// ou https://',
        variant: 'destructive',
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha o corpo do email',
        variant: 'destructive',
      });
      return;
    }

    if (selectedClients.length === 0) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione pelo menos um destinatário',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      await sendEmailCampaign({
        subject,
        body,
        recipientIds: selectedClients,
        imageUrl: trimmedImageUrl || undefined,
      });

      toast({
        title: 'Campanha enviada!',
        description: `Email enviado com sucesso para ${selectedClients.length} cliente(s)`,
      });

      // Reset form
      setSubject('');
      setBody('');
      setImageUrl('');
      setSelectedClients([]);
      setSelectAll(false);

      // Reload campaigns
      const campaignsData = await getEmailCampaigns();
      setCampaigns(campaignsData);
    } catch (error: any) {
      console.error('Erro ao enviar campanha:', error);
      
      // Check if it's the SMTP password error
      let errorMessage = error.message || 'Não foi possível enviar a campanha';
      let errorTitle = 'Erro ao enviar';
      
      if (errorMessage.includes('SMTP_PASSWORD')) {
        errorTitle = '⚠️ Senha SMTP não configurada';
        errorMessage = 'A senha do email precisa ser configurada no Supabase Dashboard. Veja o arquivo PASSO_A_PASSO_SENHA_SMTP.md para instruções detalhadas.';
      } else if (errorMessage.includes('Configuração de email não encontrada')) {
        errorTitle = '⚠️ Email não configurado';
        errorMessage = 'Configure o email em Admin > Config. Email antes de enviar campanhas.';
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
        duration: 8000, // Show for longer
      });
    } finally {
      setSending(false);
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
        <div>
          <h1 className="text-3xl font-bold">Email Marketing</h1>
          <p className="text-muted-foreground">
            Envie emails promocionais e informativos para seus clientes
          </p>
        </div>

        <Tabs defaultValue="compose" className="space-y-6">
          <TabsList>
            <TabsTrigger value="compose">
              <Mail className="mr-2 h-4 w-4" />
              Compor Email
            </TabsTrigger>
            <TabsTrigger value="history">
              <Send className="mr-2 h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>📧 Antes de enviar emails</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <p>Certifique-se de que:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Configurou a senha SMTP no Supabase Dashboard (variável <code className="bg-muted px-1 py-0.5 rounded">SMTP_PASSWORD</code>)</li>
                    <li>Preencheu o formulário em <strong>Admin → Config. Email</strong></li>
                    <li>Testou o envio de email na página de configuração</li>
                  </ol>
                  <p className="text-xs mt-2">
                    📖 Veja o arquivo <code className="bg-muted px-1 py-0.5 rounded">PASSO_A_PASSO_SENHA_SMTP.md</code> para instruções detalhadas
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Email Composition */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Compor Mensagem</CardTitle>
                    <CardDescription>
                      Crie sua campanha de email promocional
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Assunto</Label>
                      <Input
                        id="subject"
                        placeholder="Ex: Promoção especial de janeiro!"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image-url">Imagem promocional (URL)</Label>
                      <Input
                        id="image-url"
                        placeholder="https://exemplo.com/banner.png"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Opcional. A imagem deve estar hospedada em um link público.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="body">Mensagem</Label>
                      <Textarea
                        id="body"
                        placeholder="Digite sua mensagem aqui..."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={12}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        Dica: Use quebras de linha para melhor formatação
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {selectedClients.length} destinatário(s) selecionado(s)
                      </div>
                      <Button
                        onClick={handleSendCampaign}
                        disabled={sending || selectedClients.length === 0}
                      >
                        {sending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Enviar Campanha
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recipients Selection */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Destinatários</CardTitle>
                    <CardDescription>
                      Selecione os clientes que receberão o email
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 pb-4 border-b">
                      <Checkbox
                        id="select-all"
                        checked={selectAll}
                        onCheckedChange={(checked) => setSelectAll(checked as boolean)}
                      />
                      <Label
                        htmlFor="select-all"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Selecionar todos ({clients.length})
                      </Label>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {clients.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Nenhum cliente com email cadastrado
                        </p>
                      ) : (
                        clients.map((client) => (
                          <div
                            key={client.id}
                            className="flex items-start space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              id={`client-${client.id}`}
                              checked={selectedClients.includes(client.id)}
                              onCheckedChange={() => handleToggleClient(client.id)}
                            />
                            <Label
                              htmlFor={`client-${client.id}`}
                              className="flex-1 text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              <div className="font-medium">{client.name || 'Sem nome'}</div>
                              <div className="text-muted-foreground text-xs mt-1">
                                {client.email}
                              </div>
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Campanhas</CardTitle>
                <CardDescription>
                  Visualize todas as campanhas enviadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">
                      Nenhuma campanha enviada ainda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{campaign.subject}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {campaign.body}
                            </p>
                          </div>
                          <Badge variant="secondary" className="ml-4">
                            <Users className="mr-1 h-3 w-3" />
                            {campaign.recipients_count}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                          <span>
                            Enviado por: {campaign.sender?.name || 'Desconhecido'}
                          </span>
                          <span>•</span>
                          <span>
                            {format(new Date(campaign.sent_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
