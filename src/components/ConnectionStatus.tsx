import { useEffect, useState } from 'react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { checkSupabaseConnection, setupNetworkMonitoring } from '@/lib/network-check';

/**
 * Componente que monitora e exibe o status da conexão
 */
export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionStatus, setConnectionStatus] = useState<{
    checking: boolean;
    success: boolean;
    message: string;
    latency?: number;
  }>({
    checking: false,
    success: true,
    message: '',
  });

  // Verifica conexão com Supabase
  const checkConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, checking: true }));
    const result = await checkSupabaseConnection();
    setConnectionStatus({
      checking: false,
      success: result.success,
      message: result.message,
      latency: result.latency,
    });
  };

  useEffect(() => {
    // Verifica conexão inicial
    checkConnection();

    // Configura monitoramento de rede
    const cleanup = setupNetworkMonitoring(
      () => {
        setIsOnline(true);
        checkConnection();
      },
      () => {
        setIsOnline(false);
        setConnectionStatus({
          checking: false,
          success: false,
          message: 'Sem conexão com a internet',
        });
      }
    );

    // Verifica conexão periodicamente (a cada 30 segundos)
    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, 30000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  // Não mostra nada se estiver tudo OK
  if (isOnline && connectionStatus.success && !connectionStatus.checking) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {!isOnline && (
        <Alert variant="destructive" className="shadow-lg">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Sem conexão</AlertTitle>
          <AlertDescription>
            Você está offline. Verifique sua conexão com a internet.
          </AlertDescription>
        </Alert>
      )}

      {isOnline && !connectionStatus.success && !connectionStatus.checking && (
        <Alert variant="destructive" className="shadow-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de conexão</AlertTitle>
          <AlertDescription>
            {connectionStatus.message}
            <button
              onClick={checkConnection}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Tentar novamente
            </button>
          </AlertDescription>
        </Alert>
      )}

      {connectionStatus.checking && (
        <Alert className="shadow-lg">
          <Wifi className="h-4 w-4 animate-pulse" />
          <AlertTitle>Verificando conexão...</AlertTitle>
          <AlertDescription>
            Aguarde enquanto verificamos a conexão com o servidor.
          </AlertDescription>
        </Alert>
      )}

      {isOnline && connectionStatus.success && connectionStatus.latency && connectionStatus.latency > 3000 && (
        <Alert className="shadow-lg border-yellow-500">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Conexão lenta</AlertTitle>
          <AlertDescription>
            A conexão está lenta ({connectionStatus.latency}ms). Algumas operações podem demorar mais.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
