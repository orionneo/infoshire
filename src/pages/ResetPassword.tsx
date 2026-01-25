import { Loader2, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: 'Link inválido',
          description: 'Este link de recuperação é inválido ou já foi usado',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      setValidToken(true);
      setUserId(data.user_id);
    } catch (error) {
      console.error('Erro ao validar token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível validar o link de recuperação',
        variant: 'destructive',
      });
      setTimeout(() => navigate('/login'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: { newPassword: string; confirmPassword: string }) => {
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
        description: 'A senha deve ter pelo menos 6 caracteres',
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

    if (!userId || !token) return;

    setSaving(true);
    try {
      // Update password using Edge Function
      const { data: resetData, error: resetError } = await supabase.functions.invoke('reset-user-password', {
        body: JSON.stringify({
          userId: userId,
          newPassword: data.newPassword,
        }),
      });

      if (resetError) {
        const errorMsg = await resetError?.context?.text();
        console.error('Erro ao resetar senha:', errorMsg || resetError?.message);
        throw new Error(errorMsg || resetError?.message);
      }

      if (resetData?.error) {
        throw new Error(resetData.error);
      }

      // Mark token as used
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token);

      if (tokenError) throw tokenError;

      // Update profile to mark password as changed
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_changed: true })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi alterada com sucesso. Faça login com sua nova senha.',
      });

      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível alterar a senha. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validando link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">Link Inválido</p>
            <p className="text-muted-foreground text-center">
              Este link de recuperação é inválido ou já foi usado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Redefinir Senha'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
