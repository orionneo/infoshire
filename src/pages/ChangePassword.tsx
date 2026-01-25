import { Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';

export default function ChangePassword() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    if (data.newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    if (data.newPassword === '123456') {
      toast({
        title: 'Erro',
        description: 'Por favor, escolha uma senha mais segura que 123456',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      // Update profile to mark password as changed
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ password_changed: true })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi alterada com sucesso!',
      });

      // Redirect based on role
      if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/client');
      }
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível alterar a senha',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">Alterar Senha</CardTitle>
            <CardDescription>
              Por segurança, altere sua senha padrão
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                rules={{ required: 'Senha atual é obrigatória' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Atual</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite sua senha atual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="newPassword"
                rules={{ 
                  required: 'Nova senha é obrigatória',
                  minLength: {
                    value: 6,
                    message: 'A senha deve ter pelo menos 6 caracteres'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite sua nova senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                rules={{ required: 'Confirme sua nova senha' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite novamente sua nova senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
