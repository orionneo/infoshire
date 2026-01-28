import { Loader2, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth, normalizeBrazilPhoneToWaDigits } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';

export default function CompleteProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      phone: '',
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (profile?.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    if (profile?.phone) {
      navigate('/client', { replace: true });
    }
  }, [user, profile, navigate]);

  const onSubmit = async (data: { phone: string }) => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const normalizedPhone = normalizeBrazilPhoneToWaDigits(data.phone.trim());
    if (!normalizedPhone) {
      toast({
        title: 'Telefone inválido',
        description: 'Informe DDD + número (ex: 19 99798-8952).',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: normalizedPhone })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      toast({
        title: 'Cadastro atualizado',
        description: 'Seu WhatsApp foi salvo com sucesso.',
      });
      navigate('/client', { replace: true });
    } catch (err) {
      console.error('Erro ao salvar WhatsApp:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar seu WhatsApp. Tente novamente.',
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
          <div className="flex items-center justify-center gap-2">
            <Wrench className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl">InfoShire</span>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">Completar cadastro</CardTitle>
            <CardDescription>Informe seu WhatsApp para continuar</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                rules={{
                  required: 'Telefone (WhatsApp) é obrigatório',
                  pattern: {
                    value: /^[\d\s()+-]+$/,
                    message: 'Telefone inválido',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (WhatsApp) *</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full neon-border" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar WhatsApp'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
