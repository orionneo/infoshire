import { Eye, EyeOff, Loader2, Mail, Save, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getEmailConfig, testEmailConfig, upsertEmailConfig } from '@/db/api';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';
import type { EmailConfig } from '@/types/types';

type EmailConfigForm = {
  provider: 'smtp' | 'resend';
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  from_name: string;
  from_email: string;
  resend_api_key: string;
  resend_from_email: string;
  test_email: string;
};

export default function AdminEmailSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState<EmailConfig | null>(null);

  const form = useForm<EmailConfigForm>({
    defaultValues: {
      provider: 'resend',
      smtp_host: 'smtp-mail.outlook.com',
      smtp_port: 587,
      smtp_secure: false,
      smtp_user: '',
      smtp_password: '',
      from_name: 'InfoShire Assistência Técnica',
      from_email: '',
      resend_api_key: '',
      resend_from_email: 'onboarding@resend.dev',
      test_email: '',
    },
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getEmailConfig();
      if (data) {
        setConfig(data);
        form.reset({
          provider: data.provider || 'resend',
          smtp_host: data.smtp_host || 'smtp-mail.outlook.com',
          smtp_port: data.smtp_port,
          smtp_secure: data.smtp_secure,
          smtp_user: data.smtp_user || '',
          smtp_password: '', // Never load password from DB
          from_name: data.from_name,
          from_email: data.from_email || '',
          resend_api_key: '', // Never load API key from DB
          resend_from_email: data.resend_from_email || 'onboarding@resend.dev',
          test_email: '',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: EmailConfigForm) => {
    setSaving(true);
    try {
      // Save email config to database (without password/API key)
      await upsertEmailConfig({
        provider: data.provider,
        smtp_host: data.provider === 'smtp' ? data.smtp_host : null,
        smtp_port: data.smtp_port,
        smtp_secure: data.smtp_secure,
        smtp_user: data.provider === 'smtp' ? data.smtp_user : null,
        from_name: data.from_name,
        from_email: data.provider === 'smtp' ? data.from_email : null,
        resend_from_email: data.provider === 'resend' ? data.resend_from_email : null,
      });

      toast({
        title: 'Configuração salva',
        description: data.provider === 'resend' 
          ? 'Configuração salva! Agora configure a chave RESEND_API_KEY no Supabase Dashboard.'
          : 'Configuração salva! Agora configure a senha SMTP_PASSWORD no Supabase Dashboard.',
      });

      await loadConfig();
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    const testEmail = form.getValues('test_email');
    
    if (!testEmail) {
      toast({
        title: 'Email necessário',
        description: 'Por favor, informe um email para teste',
        variant: 'destructive',
      });
      return;
    }

    if (!config) {
      toast({
        title: 'Configuração necessária',
        description: 'Por favor, salve a configuração antes de testar',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    try {
      const result = await testEmailConfig(testEmail);
      
      if (result.success) {
        toast({
          title: 'Email enviado',
          description: result.message,
        });
      } else {
        toast({
          title: 'Erro ao enviar',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erro ao testar email:', error);
      toast({
        title: 'Erro ao testar',
        description: error.message || 'Não foi possível enviar o email de teste',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações de Email</h1>
          <p className="text-muted-foreground mt-2">
            Configure o servidor SMTP para envio de emails de marketing e notificações
          </p>
        </div>

        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            <strong>Recomendado: Resend</strong> - Serviço gratuito e fácil de configurar (3.000 emails/mês grátis).
            <br />
            <strong>Alternativa: SMTP</strong> - Use seu próprio email (Hotmail, Gmail, etc).
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Configuração de Email</CardTitle>
            <CardDescription>
              Escolha o provedor de email e configure os dados necessários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Provider Selection */}
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provedor de Email *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o provedor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="resend">
                            ✨ Resend (Recomendado - Grátis até 3.000 emails/mês)
                          </SelectItem>
                          <SelectItem value="smtp">
                            📧 SMTP (Use seu próprio email)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Resend é mais fácil e não precisa de email pessoal
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Resend Configuration */}
                {form.watch('provider') === 'resend' && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <h3 className="font-semibold mb-2">📖 Como configurar o Resend:</h3>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Acesse <a href="https://resend.com/signup" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/signup</a> e crie uma conta grátis</li>
                        <li>Após login, vá em "API Keys" e clique em "Create API Key"</li>
                        <li>Copie a chave gerada</li>
                        <li>Acesse o Supabase Dashboard → Settings → Edge Functions → Environment Variables</li>
                        <li>Adicione: Name = <code className="bg-muted px-1 rounded">RESEND_API_KEY</code>, Value = sua chave</li>
                        <li>Preencha o formulário abaixo e salve</li>
                      </ol>
                    </div>

                    <FormField
                      control={form.control}
                      name="from_name"
                      rules={{ required: 'Nome do remetente é obrigatório' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Remetente *</FormLabel>
                          <FormControl>
                            <Input placeholder="InfoShire Assistência Técnica" {...field} />
                          </FormControl>
                          <FormDescription>
                            Nome que aparecerá nos emails enviados
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="resend_from_email"
                      rules={{ required: 'Email do remetente é obrigatório' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email do Remetente *</FormLabel>
                          <FormControl>
                            <Input placeholder="onboarding@resend.dev" {...field} />
                          </FormControl>
                          <FormDescription>
                            Use onboarding@resend.dev para testes ou verifique seu domínio no Resend
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* SMTP Configuration */}
                {form.watch('provider') === 'smtp' && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                      <h3 className="font-semibold mb-2">⚠️ Configuração SMTP:</h3>
                      <p className="text-sm">
                        Você precisará usar seu email pessoal (Hotmail, Gmail, etc). 
                        Recomendamos usar o Resend para evitar problemas de segurança.
                      </p>
                    </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="smtp_host"
                    rules={{ required: 'Servidor SMTP é obrigatório' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servidor SMTP *</FormLabel>
                        <FormControl>
                          <Input placeholder="smtp-mail.outlook.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Endereço do servidor SMTP
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtp_port"
                    rules={{ 
                      required: 'Porta é obrigatória',
                      min: { value: 1, message: 'Porta inválida' },
                      max: { value: 65535, message: 'Porta inválida' },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porta *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="587" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Porta do servidor (587 para TLS)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="smtp_secure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Segurança *</FormLabel>
                      <Select
                        value={field.value ? 'true' : 'false'}
                        onValueChange={(value) => field.onChange(value === 'true')}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="false">TLS/STARTTLS (Recomendado para Hotmail)</SelectItem>
                          <SelectItem value="true">SSL</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Use TLS/STARTTLS para Hotmail/Outlook
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="smtp_user"
                    rules={{ 
                      required: 'Email é obrigatório',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Email inválido',
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Usuário SMTP) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="seu-email@hotmail.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Seu endereço de email completo
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtp_password"
                    rules={{ 
                      required: !config ? 'Senha é obrigatória' : false,
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha {!config && '*'}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? 'text' : 'password'}
                              placeholder={config ? '••••••••' : 'Sua senha do email'}
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          {config 
                            ? 'Deixe em branco para manter a senha atual'
                            : 'Senha do seu email (armazenada com segurança)'
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="from_name"
                  rules={{ required: 'Nome do remetente é obrigatório' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Remetente *</FormLabel>
                      <FormControl>
                        <Input placeholder="InfoShire Assistência Técnica" {...field} />
                      </FormControl>
                      <FormDescription>
                        Nome que aparecerá nos emails enviados
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="from_email"
                  rules={{ 
                    required: 'Email do remetente é obrigatório',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email do Remetente *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="seu-email@hotmail.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Geralmente o mesmo que o usuário SMTP
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

                <div className="flex gap-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Configuração
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {config && (
          <Card>
            <CardHeader>
              <CardTitle>Testar Configuração</CardTitle>
              <CardDescription>
                Envie um email de teste para verificar se tudo está funcionando
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="test_email">Email para Teste</Label>
                  <Input
                    id="test_email"
                    type="email"
                    placeholder="seu-email@exemplo.com"
                    {...form.register('test_email')}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleTestEmail} disabled={testing} variant="outline">
                    {testing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Teste
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
