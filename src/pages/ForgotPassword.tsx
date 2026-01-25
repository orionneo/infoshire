import { ArrowLeft, Loader2, Mail, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm({
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: { email: string }) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/change-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: 'E-mail enviado',
        description: 'Verifique sua caixa de entrada para redefinir sua senha',
      });
    } catch (error: any) {
      console.error('Erro ao enviar e-mail:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o e-mail de recuperação. Verifique se o e-mail está correto.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl">E-mail Enviado!</CardTitle>
              <CardDescription>
                Verifique sua caixa de entrada
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enviamos um link de recuperação de senha para o seu e-mail. 
              Clique no link para redefinir sua senha.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Não recebeu o e-mail? Verifique sua pasta de spam ou tente novamente.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setEmailSent(false)}
              >
                Tentar Novamente
              </Button>
              <Button 
                className="flex-1"
                onClick={() => navigate('/login')}
              >
                Voltar ao Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/login')}
              className="neon-hover"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Wrench className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl">InfoShire</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
            <CardDescription>
              Entre em contato com o suporte para receber um link de recuperação
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Como recuperar sua senha:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Entre em contato com o suporte da assistência técnica</li>
              <li>Informe seu e-mail cadastrado: <strong className="text-foreground">{form.watch('email') || 'seu@email.com'}</strong></li>
              <li>Você receberá um link de recuperação via WhatsApp</li>
              <li>Clique no link e defina sua nova senha</li>
            </ol>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: 'E-mail é obrigatório',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'E-mail inválido',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu E-mail</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Digite seu e-mail cadastrado" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="text-xs text-muted-foreground text-center">
                Copie seu e-mail acima e entre em contato com o suporte para solicitar a recuperação de senha.
              </p>
            </form>
          </Form>
          
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Lembrou sua senha? </span>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-primary hover:underline"
            >
              Voltar ao login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
