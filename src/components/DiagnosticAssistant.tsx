import { useEffect, useState } from 'react';
import { Brain, Loader2, AlertTriangle, CheckCircle2, Wrench, Package, Clock, X, ChevronDown, ChevronUp, Lightbulb, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import WebSearchAssistant from '@/components/WebSearchAssistant';

interface DiagnosticCause {
  description: string;
  probability: number;
  reasoning: string;
}

interface DiagnosticTest {
  description: string;
  expected_result: string;
}

interface DiagnosticResult {
  probable_causes: DiagnosticCause[];
  suggested_tests: DiagnosticTest[];
  technical_observations: string[];
  complexity: 'low' | 'medium' | 'high';
  estimated_time?: string;
  common_parts?: Array<{
    part_name: string;
    replacement_frequency: string;
  }>;
}

interface DiagnosticAssistantProps {
  problemDescription: string;
  equipment: string;
  brand?: string;
  model?: string;
  orderId?: string;
  status?: string;
  notes?: string;
  onClose?: () => void;
  isMobile?: boolean;
  open?: boolean;
}

export function DiagnosticAssistant({
  problemDescription,
  equipment,
  brand,
  model,
  orderId,
  status,
  notes,
  onClose,
  isMobile = false,
  open = true,
}: DiagnosticAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { toast } = useToast();

  // Debounce analysis trigger
  useEffect(() => {
    if (!problemDescription || problemDescription.length < 10 || !equipment) {
      setResult(null);
      return;
    }

    const timer = setTimeout(() => {
      analyzeProblem();
    }, 2000); // Wait 2 seconds after user stops typing

    return () => clearTimeout(timer);
  }, [problemDescription, equipment, brand, model, orderId, status, notes]);

  const analyzeProblem = async () => {
    setLoading(true);
    setError(null);

    try {
      // Combine problem description with notes for better context
      const fullContext = [problemDescription, notes].filter(Boolean).join(' | ');

      console.log('Calling AI diagnostic RPC function...');
      
      // Try RPC first (faster, no JWT required)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_ai_diagnostic', {
        p_text: fullContext,
        p_equipamento_tipo: equipment,
        p_marca: brand || null,
        p_modelo: model || null,
        p_os_id: orderId || null,
        p_status: status || null,
      });

      if (!rpcError && rpcData) {
        console.log('AI Diagnostic RPC Response:', rpcData);
        
        if (rpcData.ok && rpcData.diagnosis) {
          setResult(rpcData.diagnosis as DiagnosticResult);
          setError(null);
          setLoading(false);
          return;
        } else if (rpcData.error) {
          console.warn('RPC returned error:', rpcData.error);
        }
      } else {
        console.warn('RPC function failed, trying Edge Function...', rpcError);
      }

      // Fallback to Edge Function if RPC fails
      console.log('Calling Edge Function fallback...');
      const { data, error: functionError } = await supabase.functions.invoke('ai-knowledge-query', {
        body: {
          text: fullContext,
          equipamento_tipo: equipment,
          marca: brand,
          modelo: model,
          context: {
            mode: 'IN_OS',
            os_id: orderId,
            status: status,
          },
        },
      });

      if (functionError) {
        // Check if it's a JWT error
        if (functionError.message?.includes('JWT') || functionError.message?.includes('401')) {
          throw new Error('Erro de autenticação. Por favor, recarregue a página e tente novamente.');
        }
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.diagnosis) {
        console.log('Edge Function diagnosis:', data.diagnosis);
        setResult(data.diagnosis as DiagnosticResult);
      } else {
        // Fallback to empty result with helpful message
        setResult({
          probable_causes: [],
          suggested_tests: [],
          technical_observations: [
            '⚠️ Não foi possível gerar diagnóstico automático.',
            '📝 Recomendação: Adicione mais detalhes sobre o problema.',
            '🔍 Descreva sintomas específicos, quando começou, e o que já foi testado.'
          ],
          complexity: 'medium',
        });
      }
    } catch (err) {
      console.error('Error analyzing problem:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao analisar problema';
      setError(errorMessage);
      
      // Set a helpful fallback result instead of showing empty
      setResult({
        probable_causes: [],
        suggested_tests: [],
        technical_observations: [
          '❌ Erro ao processar diagnóstico.',
          '🔄 Tente novamente em alguns instantes.',
          '💡 Se o erro persistir, continue com diagnóstico manual.'
        ],
        complexity: 'medium',
      });
      
      toast({
        title: 'Erro no diagnóstico',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'text-green-600 bg-green-100 dark:bg-green-950';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950';
      case 'high':
        return 'text-red-600 bg-red-100 dark:bg-red-950';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-950';
    }
  };

  const getComplexityLabel = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'Baixa';
      case 'medium':
        return 'Média';
      case 'high':
        return 'Alta';
      default:
        return 'Desconhecida';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return 'text-red-600 bg-red-100 dark:bg-red-950';
    if (probability >= 40) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950';
    return 'text-blue-600 bg-blue-100 dark:bg-blue-950';
  };

  if (!problemDescription || problemDescription.length < 10) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Digite a descrição do problema para obter diagnóstico assistido por IA
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", isCollapsed && "h-auto")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Diagnóstico Assistido</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Sugestões baseadas em IA e histórico de ordens similares (ferramenta de apoio ao diagnóstico)
        </CardDescription>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Analisando problema...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
              <p className="text-sm text-destructive text-center">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={analyzeProblem}
                className="mt-4"
              >
                Tentar Novamente
              </Button>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Complexity Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Complexidade:</span>
                <Badge className={cn("text-xs", getComplexityColor(result.complexity))}>
                  {getComplexityLabel(result.complexity)}
                </Badge>
              </div>

              <Separator />

              {/* Probable Causes */}
              {result.probable_causes.length > 0 && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Causas Prováveis
                    </h3>
                    <div className="space-y-2">
                      {result.probable_causes.map((cause, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-sm flex-1">{cause.description}</p>
                            <Badge className={cn("ml-2", getProbabilityColor(cause.probability))}>
                              {cause.probability}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{cause.reasoning}</p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* Suggested Tests */}
              {result.suggested_tests.length > 0 && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Testes Sugeridos
                    </h3>
                    <div className="space-y-2">
                      {result.suggested_tests.map((test, index) => (
                        <Card key={index} className="p-3">
                          <p className="font-medium text-sm mb-1">{test.description}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Resultado esperado:</span> {test.expected_result}
                          </p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* Technical Observations */}
              {result.technical_observations.length > 0 && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Observações Técnicas
                    </h3>
                    <Card className="p-3 bg-muted/50">
                      <ul className="space-y-1">
                        {result.technical_observations.map((obs, index) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <span className="text-primary font-bold">•</span>
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>

                  <Separator />
                </>
              )}

              {/* Common Parts */}
              {result.common_parts && result.common_parts.length > 0 && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Peças Comuns
                    </h3>
                    <div className="space-y-2">
                      {result.common_parts.map((part, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{part.part_name}</p>
                            <Badge variant="outline" className="text-xs">
                              {part.replacement_frequency}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* Estimated Time */}
              {result.estimated_time && (
                <Card className="p-3 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Tempo Estimado</p>
                      <p className="text-sm font-semibold">{result.estimated_time}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Disclaimer */}
              <Card className="p-3 bg-muted border-dashed">
                <p className="text-xs text-muted-foreground">
                  ⚠️ <span className="font-medium">Aviso:</span> Este diagnóstico é uma sugestão baseada em IA e histórico de ordens similares. 
                  Sempre realize testes físicos e confirme o diagnóstico antes de iniciar o reparo.
                </p>
              </Card>

              {/* Web Search Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Globe className="h-4 w-4 mr-2" />
                    Buscar Mais Informações na Web
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Busca Web - Diagnóstico</DialogTitle>
                  </DialogHeader>
                  <WebSearchAssistant
                    context="diagnostico"
                    placeholder={`Ex: ${equipment} ${problemDescription.substring(0, 50)}...`}
                    title="🔍 Buscar Soluções Online"
                    description="Busque causas, testes e soluções para este problema específico"
                  />
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
