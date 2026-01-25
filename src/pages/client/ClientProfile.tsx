import { Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ClientLayout } from '@/components/layouts/ClientLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/db/api';
import { useToast } from '@/hooks/use-toast';

export default function ClientProfile() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      name: profile?.name || '',
      phone: profile?.phone || '',
    },
  });

  const onSubmit = async (data: { name: string; phone: string }) => {
    if (!profile) return;

    setLoading(true);
    try {
      await updateProfile(profile.id, {
        name: data.name || null,
        phone: data.phone || null,
      });
      
      await refreshProfile();
      
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso',
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>E-mail</FormLabel>
                  <Input value={profile?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    O e-mail não pode ser alterado
                  </p>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Altere sua senha regularmente para manter sua conta segura
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/change-password')}
                  className="w-full sm:w-auto"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Alterar Senha
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
