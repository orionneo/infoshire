/**
 * Utilitário para verificar conectividade de rede e status do Supabase
 */

import { supabase } from '@/db/supabase';

/**
 * Verifica se há conexão com a internet
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Verifica a conectividade com o Supabase
 */
export async function checkSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  latency?: number;
}> {
  if (!isOnline()) {
    return {
      success: false,
      message: 'Sem conexão com a internet',
    };
  }

  try {
    const startTime = performance.now();
    
    // Tenta fazer uma query simples para verificar a conexão
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    if (error) {
      console.error('❌ Erro ao conectar com Supabase:', error);
      return {
        success: false,
        message: `Erro de conexão: ${error.message}`,
        latency,
      };
    }

    return {
      success: true,
      message: 'Conexão estabelecida com sucesso',
      latency,
    };
  } catch (err) {
    console.error('❌ Erro inesperado ao verificar conexão:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}

/**
 * Monitora mudanças no status da conexão
 */
export function setupNetworkMonitoring(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  const handleOnline = () => {
    console.log('✅ Conexão restaurada');
    onOnline?.();
  };

  const handleOffline = () => {
    console.warn('⚠️ Conexão perdida');
    onOffline?.();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Retorna função de cleanup
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Retry automático para requisições que falharam
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erro desconhecido');
      
      if (attempt < maxRetries) {
        console.warn(`⚠️ Tentativa ${attempt} falhou, tentando novamente em ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError || new Error('Falha após múltiplas tentativas');
}
