import { useEffect, useState } from 'react';
import { Clock, Package, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/db/supabase';

interface IntelligentFlowProps {
  equipment: string;
  brand?: string;
  model?: string;
  problemDescription?: string;
  status?: string;
  hasConclusion?: boolean;
  hasParts?: boolean;
  hasValue?: boolean;
  onApplyDeadline?: (days: number) => void;
  onApplyParts?: (parts: string[]) => void;
}

interface SimilarCase {
  avg_days: number;
  case_count: number;
}

interface CommonPart {
  part_name: string;
  frequency: number;
}

export function IntelligentFlow({
  equipment,
  brand,
  model,
  problemDescription,
  status,
  hasConclusion = false,
  hasParts = false,
  hasValue = false,
  onApplyDeadline,
  onApplyParts,
}: IntelligentFlowProps) {
  const [suggestedDeadline, setSuggestedDeadline] = useState<number | null>(null);
  const [deadlineReason, setDeadlineReason] = useState<string>('');
  const [commonParts, setCommonParts] = useState<CommonPart[]>([]);
  const [inconsistencies, setInconsistencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntelligentSuggestions();
    detectInconsistencies();
  }, [equipment, brand, model, problemDescription, status]);

  const loadIntelligentSuggestions = async () => {
    setLoading(true);

    try {
      // Query similar cases for deadline suggestion
      const { data: similarCases } = await supabase
        .from('service_orders')
        .select('created_at, completed_at, equipment')
        .eq('equipment', equipment)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (similarCases && similarCases.length > 0) {
        // Calculate average days
        const totalDays = similarCases.reduce((sum, order) => {
          const created = new Date(order.created_at);
          const completed = new Date(order.completed_at);
          const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0);

        const avgDays = Math.ceil(totalDays / similarCases.length);
        setSuggestedDeadline(avgDays);
        setDeadlineReason(`Baseado em ${similarCases.length} casos similares de ${equipment}`);
      } else {
        // Default deadline based on equipment type
        const defaultDays = getDefaultDeadline(equipment);
        setSuggestedDeadline(defaultDays);
        setDeadlineReason('Prazo padrão (sem histórico de casos similares)');
      }

      // Query common parts for this equipment
      const { data: partsData } = await supabase
        .from('ai_knowledge_events')
        .select('tags_solucao')
        .eq('equipamento_tipo', equipment)
        .eq('event_type', 'SOLUTION_APPLIED')
        .not('tags_solucao', 'is', null)
        .limit(50);

      if (partsData && partsData.length > 0) {
        // Count frequency of each part
        const partFrequency: Record<string, number> = {};
        partsData.forEach((event) => {
          if (event.tags_solucao && Array.isArray(event.tags_solucao)) {
            event.tags_solucao.forEach((tag: string) => {
              partFrequency[tag] = (partFrequency[tag] || 0) + 1;
            });
          }
        });

        // Convert to array and sort by frequency
        const parts = Object.entries(partFrequency)
          .map(([part_name, frequency]) => ({ part_name, frequency }))
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 5);

        setCommonParts(parts);
      }
    } catch (error) {
      console.error('Error loading intelligent suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultDeadline = (equipment: string): number => {
    const equipmentLower = equipment.toLowerCase();
    
    if (equipmentLower.includes('celular') || equipmentLower.includes('smartphone')) {
      return 5;
    } else if (equipmentLower.includes('notebook') || equipmentLower.includes('laptop')) {
      return 7;
    } else if (equipmentLower.includes('computador') || equipmentLower.includes('desktop')) {
      return 7;
    } else if (equipmentLower.includes('tablet')) {
      return 5;
    } else if (equipmentLower.includes('console') || equipmentLower.includes('videogame')) {
      return 10;
    } else {
      return 7; // Default
    }
  };

  const detectInconsistencies = () => {
    const issues: string[] = [];

    // Check if status is "ready for pickup" but missing critical info
    if (status === 'ready_for_pickup' || status === 'completed') {
      if (!hasConclusion) {
        issues.push('Ordem marcada como concluída mas não possui descrição da conclusão');
      }
      if (!hasParts && !hasValue) {
        issues.push('Ordem concluída sem registro de peças ou valor do serviço');
      }
    }

    // Check if status is "awaiting_parts" but no parts listed
    if (status === 'awaiting_parts' && !hasParts) {
      issues.push('Status "Aguardando Peças" mas nenhuma peça foi registrada');
    }

    // Check if status is "approved" but no value
    if (status === 'approved' && !hasValue) {
      issues.push('Orçamento aprovado mas valor total não foi definido');
    }

    setInconsistencies(issues);
  };

  return (
    <div className="space-y-4">
      {/* Deadline Suggestion */}
      {suggestedDeadline && onApplyDeadline && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Prazo Sugerido</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                IA
              </Badge>
            </div>
            <CardDescription>{deadlineReason}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{suggestedDeadline} dias</p>
                <p className="text-xs text-muted-foreground">úteis</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApplyDeadline(suggestedDeadline)}
              >
                Aplicar Prazo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Este prazo é uma sugestão baseada em casos similares. Ajuste conforme necessário.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Common Parts Suggestion */}
      {commonParts.length > 0 && onApplyParts && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Peças Mais Comuns</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                IA
              </Badge>
            </div>
            <CardDescription>
              Peças frequentemente usadas em reparos de {equipment}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {commonParts.map((part, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 cursor-pointer"
                  onClick={() => onApplyParts([part.part_name])}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{part.part_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {part.frequency}x usada
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      Adicionar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApplyParts(commonParts.map(p => p.part_name))}
              className="w-full"
            >
              Adicionar Todas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Inconsistency Detection */}
      {inconsistencies.length > 0 && (
        <Alert variant="destructive" className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">
                Inconsistências Detectadas
              </p>
              <ul className="space-y-1">
                {inconsistencies.map((issue, index) => (
                  <li key={index} className="text-sm text-orange-800 dark:text-orange-200 flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                ⚠️ Estas inconsistências não bloqueiam o sistema, mas é recomendado corrigi-las.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* No Suggestions */}
      {!loading && !suggestedDeadline && commonParts.length === 0 && inconsistencies.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="text-center py-8">
            <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Nenhuma sugestão inteligente disponível no momento
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Continue usando o sistema para gerar mais dados
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
