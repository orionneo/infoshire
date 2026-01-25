import { useState } from 'react';
import { CheckCircle, Loader2, Target, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/db/supabase';

interface SolutionLearningProps {
  orderId: string;
  equipment: string;
  problemDescription: string;
  onSaved?: () => void;
}

const ROOT_CAUSES = [
  'Componente Defeituoso',
  'Desgaste Natural',
  'Dano por Líquido',
  'Queda/Impacto',
  'Problema de Software',
  'Mau Uso',
  'Defeito de Fabricação',
  'Oxidação',
  'Superaquecimento',
  'Outro',
];

const SOLUTION_TAGS = [
  'Troca de Peça',
  'Reparo de Placa',
  'Limpeza',
  'Atualização de Software',
  'Recalibração',
  'Micro-soldagem',
  'Substituição de Bateria',
  'Troca de Display',
  'Reparo de Conector',
  'Outro',
];

export function SolutionLearning({
  orderId,
  equipment,
  problemDescription,
  onSaved,
}: SolutionLearningProps) {
  const [rootCause, setRootCause] = useState<string>('');
  const [customRootCause, setCustomRootCause] = useState<string>('');
  const [solutionDescription, setSolutionDescription] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [customTag, setCustomTag] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleToggleTag = (tag: string) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(tag)) {
      newSet.delete(tag);
    } else {
      newSet.add(tag);
    }
    setSelectedTags(newSet);
  };

  const handleAddCustomTag = () => {
    if (customTag.trim()) {
      handleToggleTag(customTag.trim());
      setCustomTag('');
    }
  };

  const handleSave = async () => {
    // Validate root cause
    if (!rootCause && !customRootCause) {
      toast({
        title: 'Causa raiz obrigatória',
        description: 'Selecione ou digite a causa raiz do problema',
        variant: 'destructive',
      });
      return;
    }

    // Validate solution description
    if (!solutionDescription.trim()) {
      toast({
        title: 'Solução obrigatória',
        description: 'Descreva a solução aplicada',
        variant: 'destructive',
      });
      return;
    }

    if (solutionDescription.trim().length < 10) {
      toast({
        title: 'Solução muito curta',
        description: 'Descreva a solução com mais detalhes (mínimo 10 caracteres)',
        variant: 'destructive',
      });
      return;
    }

    // Validate tags
    if (selectedTags.size === 0) {
      toast({
        title: 'Tags obrigatórias',
        description: 'Selecione pelo menos uma tag de solução',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const finalRootCause = rootCause === 'Outro' ? customRootCause.trim() : rootCause;
      const tags = Array.from(selectedTags);

      console.log('Registrando solução via RPC...', {
        orderId,
        equipment,
        problemDescription,
        solutionDescription: solutionDescription.trim(),
        rootCause: finalRootCause,
        tags,
      });

      // Use RPC function for better validation and processing
      const { data: rpcData, error: rpcError } = await supabase.rpc('register_solution', {
        p_os_id: orderId,
        p_equipamento_tipo: equipment,
        p_problema_descricao: problemDescription,
        p_solucao_aplicada: solutionDescription.trim(),
        p_causa_raiz: finalRootCause,
        p_tags_solucao: tags,
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw new Error(rpcError.message || 'Erro ao chamar função de registro');
      }

      console.log('RPC Response:', rpcData);

      // Check if RPC returned an error
      if (rpcData && !rpcData.ok) {
        throw new Error(rpcData.error || rpcData.detail || 'Erro desconhecido ao registrar solução');
      }

      // Success!
      const stats = rpcData?.stats || {};
      console.log('Solução registrada com sucesso!', stats);

      toast({
        title: '✅ Solução registrada com sucesso!',
        description: `A IA extraiu ${stats.keywords_extracted || 0} palavras-chave e ${stats.terms_detected || 0} termos técnicos. Sistema aprendeu com esta solução!`,
      });

      // Reset form
      setRootCause('');
      setCustomRootCause('');
      setSolutionDescription('');
      setSelectedTags(new Set());

      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      console.error('Error saving solution:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: '❌ Erro ao salvar solução',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <CardTitle>Marcar como Solução Aplicada</CardTitle>
        </div>
        <CardDescription>
          Registre a solução para melhorar o sistema de IA e ajudar em casos futuros
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Root Cause */}
        <div className="space-y-2">
          <Label htmlFor="root-cause" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Causa Raiz *
          </Label>
          <Select value={rootCause} onValueChange={setRootCause}>
            <SelectTrigger id="root-cause">
              <SelectValue placeholder="Selecione a causa raiz" />
            </SelectTrigger>
            <SelectContent>
              {ROOT_CAUSES.map((cause) => (
                <SelectItem key={cause} value={cause}>
                  {cause}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rootCause === 'Outro' && (
            <Textarea
              placeholder="Descreva a causa raiz..."
              value={customRootCause}
              onChange={(e) => setCustomRootCause(e.target.value)}
              rows={2}
            />
          )}
        </div>

        {/* Solution Description */}
        <div className="space-y-2">
          <Label htmlFor="solution-description">
            Descrição da Solução Aplicada *
          </Label>
          <Textarea
            id="solution-description"
            placeholder="Descreva detalhadamente a solução aplicada (peças trocadas, procedimentos realizados, etc.)"
            value={solutionDescription}
            onChange={(e) => setSolutionDescription(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Seja específico: isso ajudará a IA a sugerir soluções similares no futuro
          </p>
        </div>

        {/* Solution Tags */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags de Solução *
          </Label>
          <div className="flex flex-wrap gap-2">
            {SOLUTION_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.has(tag) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleToggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
          {selectedTags.size > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs text-muted-foreground">Selecionadas:</span>
              {Array.from(selectedTags).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Textarea
              placeholder="Adicionar tag personalizada..."
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              rows={1}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCustomTag}
              disabled={!customTag.trim()}
            >
              Adicionar
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Registrar Solução
            </>
          )}
        </Button>

        {/* Info Card */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">
              💡 <span className="font-medium">Por que registrar?</span> Cada solução registrada 
              alimenta o sistema de IA, tornando as sugestões mais precisas e ajudando outros técnicos 
              a resolver problemas similares mais rapidamente.
            </p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
