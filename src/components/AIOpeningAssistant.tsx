import { useEffect, useState } from 'react';
import { Brain, Loader2, Lightbulb, CheckSquare, HelpCircle, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AISuggestions {
  organized_description?: string;
  suggested_category?: string;
  initial_checklist?: string[];
  clarification_questions?: string[];
}

interface AIOpeningAssistantProps {
  problemDescription: string;
  equipment: string;
  brand?: string;
  model?: string;
  onApplyDescription?: (description: string) => void;
  onApplyCategory?: (category: string) => void;
  onApplyChecklist?: (checklist: string[]) => void;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
}

export function AIOpeningAssistant({
  problemDescription,
  equipment,
  brand,
  model,
  onApplyDescription,
  onApplyCategory,
  onApplyChecklist,
  enabled = true,
  onToggle,
}: AIOpeningAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Debounce analysis trigger
  useEffect(() => {
    if (!enabled || !problemDescription || problemDescription.length < 10) {
      setSuggestions(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 1500); // Wait 1.5 seconds after user stops typing

    return () => clearTimeout(timer);
  }, [problemDescription, equipment, brand, model, enabled]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try using the RPC function (no JWT required)
      console.log('Calling AI suggestions RPC function...');
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_ai_suggestions', {
        p_text: problemDescription,
        p_equipamento_tipo: equipment || null,
        p_marca: brand || null,
        p_modelo: model || null,
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw new Error(`Erro ao buscar sugestões: ${rpcError.message || 'Erro desconhecido'}`);
      }

      if (rpcData && rpcData.suggestions) {
        console.log('AI Suggestions RPC Response:', rpcData);
        
        setSuggestions(rpcData.suggestions);
        setError(null);
        
        // Auto-select all checklist items
        if (rpcData.suggestions.initial_checklist) {
          setSelectedChecklist(new Set(rpcData.suggestions.initial_checklist));
        }
        setLoading(false);
        return;
      }

      // If no data returned, show friendly message
      throw new Error('Nenhuma sugestão disponível no momento');

    } catch (err: any) {
      console.error('Error fetching AI suggestions:', err);
      setError(err.message || 'Erro ao buscar sugestões. Tente novamente.');
      setLoading(false);
    }
  };

  const handleToggleChecklist = (item: string) => {
    const newSet = new Set(selectedChecklist);
    if (newSet.has(item)) {
      newSet.delete(item);
    } else {
      newSet.add(item);
    }
    setSelectedChecklist(newSet);
  };

  const handleApplyDescription = () => {
    if (suggestions?.organized_description && onApplyDescription) {
      onApplyDescription(suggestions.organized_description);
      toast({
        title: 'Descrição aplicada',
        description: 'A descrição organizada foi aplicada ao formulário',
      });
    }
  };

  const handleApplyCategory = () => {
    if (suggestions?.suggested_category && onApplyCategory) {
      onApplyCategory(suggestions.suggested_category);
      toast({
        title: 'Categoria aplicada',
        description: `Categoria "${suggestions.suggested_category}" foi aplicada`,
      });
    }
  };

  const handleApplyChecklist = () => {
    if (selectedChecklist.size > 0 && onApplyChecklist) {
      onApplyChecklist(Array.from(selectedChecklist));
      toast({
        title: 'Checklist aplicado',
        description: `${selectedChecklist.size} itens adicionados ao checklist`,
      });
    }
  };

  if (!enabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="text-center py-8">
          <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground mb-3">
            Assistente IA desativado
          </p>
          {onToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggle(true)}
            >
              Ativar Assistente
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!problemDescription || problemDescription.length < 10) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="text-center py-8">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-2">
            Descreva o problema para receber sugestões da IA
          </p>
          <p className="text-xs text-muted-foreground">
            Digite pelo menos 10 caracteres
          </p>
          {onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggle(false)}
              className="mt-3"
            >
              Desativar IA
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Sugestões IA</CardTitle>
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </div>
          {onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggle(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Sugestões inteligentes baseadas na descrição do problema (apenas para auxiliar o técnico)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Analisando problema...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSuggestions}
            >
              Tentar Novamente
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Verifique o console (F12) para mais detalhes
            </p>
          </div>
        )}

        {suggestions && !loading && (
          <>
            {/* Organized Description */}
            {suggestions.organized_description && onApplyDescription && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600" />
                    Descrição Organizada
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyDescription}
                    className="h-8"
                  >
                    Aplicar
                  </Button>
                </div>
                <Card className="p-3 bg-muted/50">
                  <p className="text-sm">{suggestions.organized_description}</p>
                </Card>
              </div>
            )}

            {/* Suggested Category */}
            {suggestions.suggested_category && onApplyCategory && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Categoria Sugerida
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCategory}
                      className="h-8"
                    >
                      Aplicar
                    </Button>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {suggestions.suggested_category}
                  </Badge>
                </div>
              </>
            )}

            {/* Initial Checklist */}
            {suggestions.initial_checklist && suggestions.initial_checklist.length > 0 && onApplyChecklist && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-green-600" />
                      Checklist Inicial
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyChecklist}
                      disabled={selectedChecklist.size === 0}
                      className="h-8"
                    >
                      Adicionar ({selectedChecklist.size})
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {suggestions.initial_checklist.map((item, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                        <Checkbox
                          id={`checklist-${index}`}
                          checked={selectedChecklist.has(item)}
                          onCheckedChange={() => handleToggleChecklist(item)}
                        />
                        <label
                          htmlFor={`checklist-${index}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {item}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Clarification Questions */}
            {suggestions.clarification_questions && suggestions.clarification_questions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-600" />
                    Perguntas de Clarificação
                  </h3>
                  <Card className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <ul className="space-y-2">
                      {suggestions.clarification_questions
                        .filter((q) => q && q.trim().length > 0) // Filter out empty questions
                        .map((question, index) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                            <span className="flex-1 text-foreground">{question}</span>
                          </li>
                        ))}
                    </ul>
                  </Card>
                </div>
              </>
            )}

            {/* Disclaimer */}
            <Card className="p-3 bg-muted/50 border-dashed">
              <p className="text-xs text-muted-foreground">
                💡 <span className="font-medium">Dica:</span> Todas as sugestões são editáveis. 
                Use-as como ponto de partida e ajuste conforme necessário.
              </p>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}
