import { AlertCircle, CheckCircle2, Loader2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/db/supabase';

export default function InitializeAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreateAdmin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-admin');

      if (error) {
        const errorMsg = await error?.context?.text();
        throw new Error(errorMsg || error?.message || 'Erro ao criar administrador');
      }

      setResult({
        success: true,
        message: 'Usuário administrador criado com sucesso!',
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Erro ao criar administrador',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <Wrench className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl">InfoShire</span>
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">Inicializar Sistema</CardTitle>
            <CardDescription>Configure o usuário administrador padrão</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">Credenciais do Administrador Padrão:</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Usuário:</span> <code className="bg-background px-2 py-1 rounded">admin</code>
              </p>
              <p>
                <span className="font-medium">Senha:</span> <code className="bg-background px-2 py-1 rounded">admin123</code>
              </p>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Altere a senha padrão após o primeiro acesso por questões de segurança.
            </AlertDescription>
          </Alert>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleCreateAdmin}
              disabled={loading || result?.success}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando Administrador...
                </>
              ) : result?.success ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Administrador Criado
                </>
              ) : (
                'Criar Administrador Padrão'
              )}
            </Button>

            {result?.success && (
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="w-full"
                size="lg"
              >
                Ir para Login
              </Button>
            )}
          </div>

          <div className="border-t pt-4 space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">Alternativa:</p>
            <p>
              Você também pode criar o primeiro usuário através do registro normal. O primeiro usuário
              registrado automaticamente se torna administrador.
            </p>
            <Button
              variant="link"
              onClick={() => navigate('/register')}
              className="p-0 h-auto"
            >
              Ir para Registro →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
