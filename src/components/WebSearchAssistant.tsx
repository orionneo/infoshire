import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ExternalLink, Copy, CheckCircle2, AlertCircle, Loader2, Lightbulb, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface WebSearchAssistantProps {
  context?: 'abertura_os' | 'diagnostico' | 'validacao';
  onApplyResult?: (result: string) => void;
  placeholder?: string;
  title?: string;
  description?: string;
}

interface SearchResult {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
  searchQueries: string[];
}

export default function WebSearchAssistant({
  context,
  onApplyResult,
  placeholder = 'Ex: iPhone 13 Pro Max especificações bateria',
  title = '🌐 Busca Web com IA',
  description = 'Busque informações técnicas na web com citações de fontes confiáveis',
}: WebSearchAssistantProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  const [savingToKB, setSavingToKB] = useState(false);

  // Extract key insights from the answer
  const extractInsights = (answer: string): string[] => {
    const insights: string[] = [];
    
    // Split by lines and filter meaningful content
    const lines = answer.split('\n').filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip very short lines or headers
      if (trimmed.length < 15) continue;
      
      // Look for bullet points, numbered lists, or important info
      if (
        trimmed.match(/^[-•*]\s/) || // Bullet points
        trimmed.match(/^\d+[\.)]\s/) || // Numbered lists
        trimmed.includes(':') || // Key-value pairs
        trimmed.match(/\b(especificação|problema|causa|solução|comum|frequente|sintoma|diagnóstico)\b/i) // Keywords
      ) {
        // Clean up the line
        let insight = trimmed
          .replace(/^[-•*]\s/, '• ')
          .replace(/^\d+[\.)]\s/, '• ');
        
        // Limit length
        if (insight.length > 150) {
          insight = insight.substring(0, 147) + '...';
        }
        
        insights.push(insight);
        
        // Limit to 5 key insights
        if (insights.length >= 5) break;
      }
    }
    
    // If no insights found, take first few sentences
    if (insights.length === 0) {
      const sentences = answer.match(/[^.!?]+[.!?]+/g) || [];
      insights.push(...sentences.slice(0, 3).map(s => '• ' + s.trim()));
    }
    
    return insights;
  };

  // Save insights to knowledge base
  const saveToKnowledgeBase = async (insights: string[], searchQuery: string) => {
    setSavingToKB(true);
    try {
      // Extract terms from query and insights
      const allText = `${searchQuery} ${insights.join(' ')}`;
      const words = allText.toLowerCase()
        .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3);
      
      // Get unique technical terms (words that appear in insights)
      const technicalTerms = new Set<string>();
      insights.forEach(insight => {
        const insightWords = insight.toLowerCase()
          .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 3);
        insightWords.forEach(w => technicalTerms.add(w));
      });

      // Save each term to knowledge base
      const termsToSave = Array.from(technicalTerms).slice(0, 10); // Limit to 10 terms
      
      for (const term of termsToSave) {
        // Check if term already exists
        const { data: existing } = await supabase
          .from('ai_terms')
          .select('id, frequency')
          .eq('normalized_term', term)
          .maybeSingle();

        if (existing) {
          // Update frequency
          await supabase
            .from('ai_terms')
            .update({ frequency: existing.frequency + 1 })
            .eq('id', existing.id);
        } else {
          // Insert new term
          await supabase
            .from('ai_terms')
            .insert({
              term: term.charAt(0).toUpperCase() + term.slice(1),
              normalized_term: term,
              definition_internal: insights[0].substring(0, 200), // Use first insight as definition
              term_category: 'Hardware',
              frequency: 1,
            });
        }
      }

      toast.success('Insights salvos na base de conhecimento!');
    } catch (err) {
      console.error('Erro ao salvar na base de conhecimento:', err);
      // Don't show error to user, it's not critical
    } finally {
      setSavingToKB(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Digite uma consulta para buscar');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResult(null);
    setShowFullAnswer(false);

    try {
      console.log('🔍 Iniciando busca web:', { query, context });

      const { data, error: functionError } = await supabase.functions.invoke('ai-web-search', {
        body: {
          query: query.trim(),
          context,
        },
      });

      if (functionError) {
        throw functionError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar informações');
      }

      console.log('✅ Busca concluída:', {
        answerLength: data.answer?.length,
        sourcesCount: data.sources?.length,
      });

      setResult({
        answer: data.answer,
        sources: data.sources || [],
        searchQueries: data.searchQueries || [],
      });

      toast.success('Informações encontradas!');
    } catch (err: any) {
      console.error('❌ Erro na busca:', err);
      const errorMessage = err.message || 'Erro ao buscar informações. Tente novamente.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyInsights = () => {
    if (result?.answer) {
      const insights = extractInsights(result.answer);
      const insightsText = insights.join('\n');
      navigator.clipboard.writeText(insightsText);
      setCopied(true);
      toast.success('Insights copiados!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyInsights = async () => {
    if (result?.answer && onApplyResult) {
      const insights = extractInsights(result.answer);
      const insightsText = insights.join('\n');
      onApplyResult(insightsText);
      toast.success('Insights aplicados ao campo!');
      
      // Save to knowledge base in background
      await saveToKnowledgeBase(insights, query);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input de busca */}
        <div className="space-y-2">
          <Label htmlFor="search-query">O que você quer saber?</Label>
          <div className="flex gap-2">
            <Input
              id="search-query"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSearching) {
                  handleSearch();
                }
              }}
              disabled={isSearching}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="min-w-[100px]"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Aviso sobre tempo de resposta */}
        {isSearching && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Buscando informações na web... A primeira resposta pode levar até 30 segundos. Por favor, aguarde.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading skeleton */}
        {isSearching && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-muted" />
            <Skeleton className="h-4 w-full bg-muted" />
            <Skeleton className="h-4 w-3/4 bg-muted" />
          </div>
        )}

        {/* Erro */}
        {error && !isSearching && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Resultado */}
        {result && !isSearching && (
          <div className="space-y-4">
            {/* Queries de busca usadas */}
            {result.searchQueries.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Buscas realizadas:</Label>
                <div className="flex flex-wrap gap-2">
                  {result.searchQueries.map((q, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {q}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Insights Principais */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                <Label className="text-sm font-semibold">Insights Principais:</Label>
              </div>
              <Card className="border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/30">
                <CardContent className="p-4">
                  <ul className="space-y-2.5">
                    {extractInsights(result.answer).map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="text-yellow-700 dark:text-yellow-400 font-bold text-base mt-0.5 flex-shrink-0">•</span>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words overflow-wrap-anywhere">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Resposta Completa (Collapsible) */}
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullAnswer(!showFullAnswer)}
                className="w-full justify-between"
              >
                <span className="text-sm">Resposta Completa</span>
                {showFullAnswer ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              
              {showFullAnswer && (
                <ScrollArea className="h-[200px] w-full rounded-lg border border-border">
                  <div className="bg-muted/50 p-4">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{result.answer}</p>
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Fontes */}
            {result.sources.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Fontes ({result.sources.length}):
                </Label>
                <ScrollArea className="h-[120px] w-full">
                  <div className="space-y-2 pr-4">
                    {result.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group text-sm"
                      >
                        <ExternalLink className="h-3 w-3 mt-0.5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate group-hover:text-primary">
                            {source.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{source.url}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Aviso de validação */}
            <Alert className="border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-xs text-foreground">
                💡 <strong>Dica:</strong> Use os insights como referência para descrever melhor o problema. Sempre valide as informações.
              </AlertDescription>
            </Alert>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="default" 
                onClick={handleApplyInsights} 
                disabled={savingToKB}
                className="flex-1"
              >
                {savingToKB ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Aplicar e Salvar
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCopyInsights}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            
            {/* Info sobre salvamento */}
            <div className="text-xs text-muted-foreground text-center">
              <Database className="h-3 w-3 inline mr-1" />
              Insights serão salvos automaticamente na base de conhecimento
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
