import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Brain, Database, AlertCircle, CheckCircle, RefreshCw, 
  Plus, Search, Edit, Trash2, Eye, ThumbsUp, BookOpen, TrendingUp,
  Award, Clock, Wrench, Tag, Sparkles, FileText, Filter, X, Globe, Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getAIKnowledgeStats,
  processAIKnowledgeEvents,
  getAIConfig,
  updateAIConfig,
  createDocumentedCase,
  updateDocumentedCase,
  deleteDocumentedCase,
  searchDocumentedCases,
  getEquipmentSuggestions,
  getBrandSuggestions,
  getTagSuggestions,
  markCaseHelpful,
  getKnowledgeContributionStats,
  convertKnowledgeEventsToCases,
  incrementCaseViewCount,
} from '@/db/api';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogFooter,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import WebSearchAssistant from '@/components/WebSearchAssistant';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import type { DocumentedCase, DocumentedCaseInput, KnowledgeContributionStats } from '@/types/types';
import { useDebounce } from '@/hooks/use-debounce';

export default function AIKnowledgeAdmin() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('add-case');
  
  // AI Engine Stats
  const [stats, setStats] = useState<{
    total_events: number;
    pending_events: number;
    total_terms: number;
    total_errors: number;
    last_processed: string | null;
  } | null>(null);

  const [config, setConfig] = useState({
    autoLearnEnabled: true,
    webEnabled: false,
    restrictedWeb: true,
  });

  // Knowledge Base Stats
  const [contributionStats, setContributionStats] = useState<KnowledgeContributionStats | null>(null);

  // Case Form State
  const [caseForm, setCaseForm] = useState<DocumentedCaseInput>({
    title: '',
    equipment_type: '',
    brand: '',
    model: '',
    problem_description: '',
    solution_description: '',
    tags: [],
    difficulty_level: undefined,
    estimated_time_minutes: undefined,
    parts_used: [],
    estimated_cost: undefined,
    notes: '',
  });

  // Autocomplete suggestions
  const [equipmentSuggestions, setEquipmentSuggestions] = useState<string[]>([]);
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showEquipmentSuggestions, setShowEquipmentSuggestions] = useState(false);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Case Library State
  const [cases, setCases] = useState<DocumentedCase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [loadingCases, setLoadingCases] = useState(false);

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<DocumentedCase | null>(null);

  // Tag input
  const [tagInput, setTagInput] = useState('');

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Carregar dados iniciais
  useEffect(() => {
    loadAllData();
  }, []);

  // Buscar casos quando filtros mudam
  useEffect(() => {
    if (activeTab === 'library') {
      loadCases();
    }
  }, [debouncedSearch, equipmentFilter, difficultyFilter, activeTab]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [statsData, autoLearn, webEnabled, restrictedWeb, contribStats] = await Promise.all([
        getAIKnowledgeStats(),
        getAIConfig('AUTO_LEARN_ENABLED'),
        getAIConfig('WEB_ENABLED'),
        getAIConfig('RESTRICTED_WEB'),
        getKnowledgeContributionStats(),
      ]);

      setStats(statsData);
      setConfig({
        autoLearnEnabled: autoLearn === 'true',
        webEnabled: webEnabled === 'true',
        restrictedWeb: restrictedWeb === 'true',
      });
      setContributionStats(contribStats);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as estatísticas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCases = async () => {
    try {
      setLoadingCases(true);
      const results = await searchDocumentedCases({
        search: debouncedSearch || undefined,
        equipment: equipmentFilter !== 'all' ? equipmentFilter : undefined,
        difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
        limit: 100,
      });
      setCases(results);
    } catch (error) {
      console.error('Erro ao carregar casos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os casos',
        variant: 'destructive',
      });
    } finally {
      setLoadingCases(false);
    }
  };

  // Autocomplete handlers
  const handleEquipmentChange = async (value: string) => {
    setCaseForm({ ...caseForm, equipment_type: value });
    if (value.length >= 2) {
      const suggestions = await getEquipmentSuggestions(value);
      setEquipmentSuggestions(suggestions.map(s => s.equipment_type));
      setShowEquipmentSuggestions(true);
    } else {
      setShowEquipmentSuggestions(false);
    }
  };

  const handleBrandChange = async (value: string) => {
    setCaseForm({ ...caseForm, brand: value });
    if (value.length >= 2) {
      const suggestions = await getBrandSuggestions(value);
      setBrandSuggestions(suggestions.map(s => s.brand));
      setShowBrandSuggestions(true);
    } else {
      setShowBrandSuggestions(false);
    }
  };

  const handleTagInputChange = async (value: string) => {
    setTagInput(value);
    if (value.length >= 2) {
      const suggestions = await getTagSuggestions(value);
      setTagSuggestions(suggestions.map(s => s.tag));
      setShowTagSuggestions(true);
    } else {
      setShowTagSuggestions(false);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !caseForm.tags?.includes(tag)) {
      setCaseForm({
        ...caseForm,
        tags: [...(caseForm.tags || []), tag],
      });
      setTagInput('');
      setShowTagSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCaseForm({
      ...caseForm,
      tags: caseForm.tags?.filter(t => t !== tagToRemove) || [],
    });
  };

  // Form handlers
  const handleSubmitCase = async () => {
    try {
      // Validação
      if (!caseForm.title || !caseForm.equipment_type || !caseForm.problem_description || !caseForm.solution_description) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha todos os campos obrigatórios',
          variant: 'destructive',
        });
        return;
      }

      await createDocumentedCase(caseForm);
      
      toast({
        title: '✅ Caso Documentado!',
        description: 'O caso foi adicionado à base de conhecimento',
      });

      // Reset form
      setCaseForm({
        title: '',
        equipment_type: '',
        brand: '',
        model: '',
        problem_description: '',
        solution_description: '',
        tags: [],
        difficulty_level: undefined,
        estimated_time_minutes: undefined,
        parts_used: [],
        estimated_cost: undefined,
        notes: '',
      });

      // Reload stats
      await loadAllData();
    } catch (error) {
      console.error('Erro ao criar caso:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o caso',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCase = async () => {
    if (!selectedCase) return;

    try {
      await updateDocumentedCase(selectedCase.id, caseForm);
      
      toast({
        title: 'Caso Atualizado',
        description: 'As alterações foram salvas',
      });

      setEditDialogOpen(false);
      await loadCases();
      await loadAllData();
    } catch (error) {
      console.error('Erro ao atualizar caso:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o caso',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCase = async () => {
    if (!selectedCase) return;

    try {
      await deleteDocumentedCase(selectedCase.id);
      
      toast({
        title: 'Caso Removido',
        description: 'O caso foi removido da base de conhecimento',
      });

      setDeleteDialogOpen(false);
      await loadCases();
      await loadAllData();
    } catch (error) {
      console.error('Erro ao deletar caso:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o caso',
        variant: 'destructive',
      });
    }
  };

  const handleMarkHelpful = async (caseId: string) => {
    try {
      await markCaseHelpful(caseId);
      toast({
        title: 'Obrigado!',
        description: 'Feedback registrado',
      });
      await loadCases();
    } catch (error) {
      console.error('Erro ao marcar como útil:', error);
    }
  };

  // Processar eventos pendentes
  const handleProcessEvents = async () => {
    try {
      setProcessing(true);
      const result = await processAIKnowledgeEvents(50);

      toast({
        title: 'Processamento Concluído',
        description: `${result.processed_count} eventos processados, ${result.new_terms_count} novos termos aprendidos`,
      });

      await loadAllData();
    } catch (error) {
      console.error('Erro ao processar eventos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar os eventos',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Converter eventos em casos documentados
  const handleConvertEventsToCases = async () => {
    try {
      setProcessing(true);
      const result = await convertKnowledgeEventsToCases(undefined, true);

      toast({
        title: 'Conversão Concluída',
        description: `${result.cases_created} casos criados a partir de aprendizados documentados`,
      });

      await loadAllData();
      await loadCases();
    } catch (error) {
      console.error('Erro ao converter eventos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível converter os eventos em casos',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Atualizar configuração
  const handleConfigChange = async (key: string, value: boolean) => {
    try {
      await updateAIConfig(key, value.toString());
      setConfig((prev) => ({ ...prev, [key]: value }));

      toast({
        title: 'Configuração Atualizada',
        description: 'As alterações foram salvas com sucesso',
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a configuração',
        variant: 'destructive',
      });
    }
  };

  const openViewDialog = async (caseItem: DocumentedCase) => {
    setSelectedCase(caseItem);
    setViewDialogOpen(true);
    // Increment view count asynchronously (don't wait)
    incrementCaseViewCount(caseItem.id).catch(console.error);
  };

  const openEditDialog = (caseItem: DocumentedCase) => {
    setSelectedCase(caseItem);
    setCaseForm({
      title: caseItem.title,
      equipment_type: caseItem.equipment_type,
      brand: caseItem.brand || '',
      model: caseItem.model || '',
      problem_description: caseItem.problem_description,
      solution_description: caseItem.solution_description,
      tags: caseItem.tags || [],
      difficulty_level: caseItem.difficulty_level || undefined,
      estimated_time_minutes: caseItem.estimated_time_minutes || undefined,
      parts_used: caseItem.parts_used || [],
      estimated_cost: caseItem.estimated_cost || undefined,
      notes: caseItem.notes || '',
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (caseItem: DocumentedCase) => {
    setSelectedCase(caseItem);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-4 xl:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 xl:w-8 xl:h-8 text-primary" />
            Base de Conhecimento IA
          </h1>
          <p className="text-muted-foreground mt-1 text-sm xl:text-base">
            Documente casos e alimente o sistema de diagnóstico assistido
          </p>
        </div>
        <Button onClick={loadAllData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="add-case" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden xl:inline">Adicionar Caso</span>
            <span className="xl:hidden">Adicionar</span>
          </TabsTrigger>
          <TabsTrigger value="web-search" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden xl:inline">Busca Web</span>
            <span className="xl:hidden">Web</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden xl:inline">Biblioteca</span>
            <span className="xl:hidden">Casos</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden xl:inline">Estatísticas</span>
            <span className="xl:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        {/* Add Case Tab */}
        <TabsContent value="add-case" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Documentar Novo Caso
              </CardTitle>
              <CardDescription>
                Compartilhe seu conhecimento técnico para ajudar outros técnicos e melhorar o diagnóstico assistido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Título do Caso <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Ex: Notebook não liga após queda d'água"
                  value={caseForm.title}
                  onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
                />
              </div>

              {/* Equipment Type with Autocomplete */}
              <div className="space-y-2 relative">
                <Label htmlFor="equipment">
                  Tipo de Equipamento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="equipment"
                  placeholder="Ex: Notebook, Smartphone, Desktop..."
                  value={caseForm.equipment_type}
                  onChange={(e) => handleEquipmentChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowEquipmentSuggestions(false), 200)}
                />
                {showEquipmentSuggestions && equipmentSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                    {equipmentSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                        onClick={() => {
                          setCaseForm({ ...caseForm, equipment_type: suggestion });
                          setShowEquipmentSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Brand and Model */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    placeholder="Ex: Dell, Samsung, Apple..."
                    value={caseForm.brand}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
                  />
                  {showBrandSuggestions && brandSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                      {brandSuggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                          onClick={() => {
                            setCaseForm({ ...caseForm, brand: suggestion });
                            setShowBrandSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    placeholder="Ex: Inspiron 15, Galaxy S21..."
                    value={caseForm.model}
                    onChange={(e) => setCaseForm({ ...caseForm, model: e.target.value })}
                  />
                </div>
              </div>

              {/* Problem Description */}
              <div className="space-y-2">
                <Label htmlFor="problem">
                  Descrição do Problema <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="problem"
                  placeholder="Descreva os sintomas, comportamento do equipamento, o que o cliente relatou..."
                  value={caseForm.problem_description}
                  onChange={(e) => setCaseForm({ ...caseForm, problem_description: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Seja específico: inclua sintomas, mensagens de erro, comportamentos observados
                </p>
              </div>

              {/* Solution Description */}
              <div className="space-y-2">
                <Label htmlFor="solution">
                  Solução Aplicada <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="solution"
                  placeholder="Descreva passo a passo como resolveu o problema, testes realizados, peças trocadas..."
                  value={caseForm.solution_description}
                  onChange={(e) => setCaseForm({ ...caseForm, solution_description: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Detalhe o processo: diagnóstico, testes, reparos, verificações finais
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags / Palavras-chave</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {caseForm.tags?.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    id="tags"
                    placeholder="Digite uma tag e pressione Enter"
                    value={tagInput}
                    onChange={(e) => handleTagInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                  />
                  {showTagSuggestions && tagSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                      {tagSuggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-sm flex items-center gap-2"
                          onClick={() => addTag(suggestion)}
                        >
                          <Tag className="w-3 h-3" />
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ex: oxidação, curto-circuito, tela-quebrada, bateria, placa-mãe
                </p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Nível de Dificuldade</Label>
                  <Select
                    value={caseForm.difficulty_level}
                    onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                      setCaseForm({ ...caseForm, difficulty_level: value })
                    }
                  >
                    <SelectTrigger id="difficulty">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">🟢 Fácil</SelectItem>
                      <SelectItem value="medium">🟡 Médio</SelectItem>
                      <SelectItem value="hard">🔴 Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Tempo Estimado (min)</Label>
                  <Input
                    id="time"
                    type="number"
                    placeholder="Ex: 60"
                    value={caseForm.estimated_time_minutes || ''}
                    onChange={(e) =>
                      setCaseForm({
                        ...caseForm,
                        estimated_time_minutes: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Custo Estimado (R$)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 150.00"
                    value={caseForm.estimated_cost || ''}
                    onChange={(e) =>
                      setCaseForm({
                        ...caseForm,
                        estimated_cost: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações Adicionais</Label>
                <Textarea
                  id="notes"
                  placeholder="Dicas, cuidados especiais, ferramentas necessárias..."
                  value={caseForm.notes}
                  onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Globe className="w-4 h-4 mr-2" />
                      Validar com Web
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Validar Informações Técnicas</DialogTitle>
                    </DialogHeader>
                    <WebSearchAssistant
                      context="validacao"
                      placeholder={`Ex: ${caseForm.equipment_type} ${caseForm.problem_description.substring(0, 30)}...`}
                      title="🔍 Validar com Fontes Externas"
                      description="Busque informações adicionais para validar e enriquecer este caso"
                      onApplyResult={(result) => {
                        // Adicionar informações às observações
                        const currentNotes = caseForm.notes || '';
                        const newNotes = currentNotes 
                          ? `${currentNotes}\n\n--- Validação Web ---\n${result}`
                          : `--- Validação Web ---\n${result}`;
                        setCaseForm({ ...caseForm, notes: newNotes });
                      }}
                    />
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCaseForm({
                      title: '',
                      equipment_type: '',
                      brand: '',
                      model: '',
                      problem_description: '',
                      solution_description: '',
                      tags: [],
                      difficulty_level: undefined,
                      estimated_time_minutes: undefined,
                      parts_used: [],
                      estimated_cost: undefined,
                      notes: '',
                    });
                  }}
                >
                  Limpar
                </Button>
                <Button onClick={handleSubmitCase}>
                  <Plus className="w-4 h-4 mr-2" />
                  Salvar Caso
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Web Search Tab */}
        <TabsContent value="web-search" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Pesquisa Web para Casos Técnicos
              </CardTitle>
              <CardDescription>
                Pesquise informações técnicas na web e salve como casos documentados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <WebSearchAssistant
                context="diagnostico"
                placeholder="Ex: iPhone 13 Pro Max não carrega, Samsung Galaxy tela preta, MacBook Pro não liga..."
                title="🔍 Buscar Informações Técnicas"
                description="Pesquise problemas técnicos, soluções e especificações de equipamentos"
                onApplyResult={(result) => {
                  // Pre-fill the case form with search results
                  const lines = result.split('\n').filter(line => line.trim());
                  const title = lines[0]?.replace(/^[•\-*]\s*/, '').substring(0, 100) || 'Caso da Busca Web';
                  
                  setCaseForm({
                    ...caseForm,
                    title: title,
                    problem_description: result.substring(0, 500),
                    notes: `--- Informações da Busca Web ---\n${result}`,
                  });
                  
                  // Switch to add-case tab
                  setActiveTab('add-case');
                  
                  toast({
                    title: 'Informações Aplicadas',
                    description: 'Os resultados foram aplicados ao formulário. Revise e complete os dados.',
                  });
                }}
              />
              
              <Separator />
              
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Dicas para Pesquisa Eficiente:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Seja específico: inclua marca, modelo e sintoma</li>
                      <li>Use termos técnicos quando possível</li>
                      <li>Pesquise em português ou inglês para melhores resultados</li>
                      <li>Revise e adapte as informações antes de salvar</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Biblioteca de Casos Documentados
              </CardTitle>
              <CardDescription>
                Pesquise, visualize e gerencie todos os casos documentados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, problema, solução..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                    <SelectTrigger className="w-full xl:w-[180px]">
                      <SelectValue placeholder="Equipamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Notebook">Notebook</SelectItem>
                      <SelectItem value="Smartphone">Smartphone</SelectItem>
                      <SelectItem value="Desktop">Desktop</SelectItem>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="w-full xl:w-[180px]">
                      <SelectValue placeholder="Dificuldade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="easy">🟢 Fácil</SelectItem>
                      <SelectItem value="medium">🟡 Médio</SelectItem>
                      <SelectItem value="hard">🔴 Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cases Table */}
              {loadingCases ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : cases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum caso encontrado</p>
                  <p className="text-sm">Comece documentando seu primeiro caso!</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead className="hidden xl:table-cell">Equipamento</TableHead>
                          <TableHead className="hidden xl:table-cell">Dificuldade</TableHead>
                          <TableHead className="hidden xl:table-cell">Tempo</TableHead>
                          <TableHead className="hidden xl:table-cell">Visualizações</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cases.map((caseItem) => (
                          <TableRow key={caseItem.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-medium">{caseItem.title}</div>
                                <div className="text-xs text-muted-foreground xl:hidden">
                                  {caseItem.equipment_type}
                                  {caseItem.difficulty_level && (
                                    <span className="ml-2">
                                      {caseItem.difficulty_level === 'easy' && '🟢'}
                                      {caseItem.difficulty_level === 'medium' && '🟡'}
                                      {caseItem.difficulty_level === 'hard' && '🔴'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">{caseItem.equipment_type}</TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {caseItem.difficulty_level === 'easy' && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                                  Fácil
                                </Badge>
                              )}
                              {caseItem.difficulty_level === 'medium' && (
                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                                  Médio
                                </Badge>
                              )}
                              {caseItem.difficulty_level === 'hard' && (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400">
                                  Difícil
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {caseItem.estimated_time_minutes ? `${caseItem.estimated_time_minutes} min` : '-'}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4 text-muted-foreground" />
                                {caseItem.view_count}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openViewDialog(caseItem)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(caseItem)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(caseItem)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6 mt-6">
          {/* Knowledge Base Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Casos Documentados</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contributionStats?.total_cases || 0}</div>
                <p className="text-xs text-muted-foreground">Na base de conhecimento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Visualizações</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contributionStats?.total_views || 0}</div>
                <p className="text-xs text-muted-foreground">Casos consultados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avaliações Positivas</CardTitle>
                <ThumbsUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contributionStats?.total_helpful || 0}</div>
                <p className="text-xs text-muted-foreground">Casos marcados como úteis</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contributionStats?.avg_time_minutes ? Math.round(contributionStats.avg_time_minutes) : 0} min
                </div>
                <p className="text-xs text-muted-foreground">Por reparo</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Contributors */}
          {contributionStats?.top_contributors && contributionStats.top_contributors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Top Contribuidores
                </CardTitle>
                <CardDescription>Técnicos que mais documentaram casos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contributionStats.top_contributors.map((contributor, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium">{contributor.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {contributor.count} casos documentados
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">{contributor.helpful_total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Engine Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eventos Capturados</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_events || 0}</div>
                <p className="text-xs text-muted-foreground">De OS criadas/editadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eventos Pendentes</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pending_events || 0}</div>
                <p className="text-xs text-muted-foreground">Aguardando processamento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Termos Aprendidos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_terms || 0}</div>
                <p className="text-xs text-muted-foreground">No glossário técnico</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Erros Não Resolvidos</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_errors || 0}</div>
                <p className="text-xs text-muted-foreground">Requerem atenção</p>
              </CardContent>
            </Card>
          </div>

          {/* AI Engine Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Motor de Aprendizado Automático</CardTitle>
              <CardDescription>Processar eventos capturados automaticamente das OS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                  <p className="font-medium">Processar Eventos Pendentes</p>
                  <p className="text-sm text-muted-foreground">
                    Analisa eventos capturados e atualiza o glossário de termos
                  </p>
                </div>
                <Button onClick={handleProcessEvents} disabled={processing || (stats?.pending_events || 0) === 0}>
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Processar ({stats?.pending_events || 0})
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pt-4 border-t">
                <div>
                  <p className="font-medium">Converter Aprendizados em Casos</p>
                  <p className="text-sm text-muted-foreground">
                    Transforma aprendizados documentados em casos da biblioteca
                  </p>
                </div>
                <Button onClick={handleConvertEventsToCases} disabled={processing} variant="secondary">
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Convertendo...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Converter para Biblioteca
                    </>
                  )}
                </Button>
              </div>

              {stats?.last_processed && (
                <div className="text-sm text-muted-foreground">
                  Último processamento: {new Date(stats.last_processed).toLocaleString('pt-BR')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Motor IA</CardTitle>
              <CardDescription>Controle o comportamento do sistema de aprendizado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-learn">Aprendizado Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Captura automaticamente eventos ao criar/editar OS
                  </p>
                </div>
                <Switch
                  id="auto-learn"
                  checked={config.autoLearnEnabled}
                  onCheckedChange={(checked) => handleConfigChange('AUTO_LEARN_ENABLED', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="web-enabled">Busca Web</Label>
                  <p className="text-sm text-muted-foreground">
                    Enriquecer conhecimento com fontes web (experimental)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.webEnabled ? 'default' : 'secondary'}>
                    {config.webEnabled ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Switch
                    id="web-enabled"
                    checked={config.webEnabled}
                    onCheckedChange={(checked) => handleConfigChange('WEB_ENABLED', checked)}
                  />
                </div>
              </div>

              {config.webEnabled && (
                <div className="flex items-center justify-between pl-6 border-l-2 border-muted">
                  <div className="space-y-0.5">
                    <Label htmlFor="restricted-web">Restringir a Fontes Confiáveis</Label>
                    <p className="text-sm text-muted-foreground">
                      Apenas consultar fontes whitelisted (recomendado)
                    </p>
                  </div>
                  <Switch
                    id="restricted-web"
                    checked={config.restrictedWeb}
                    onCheckedChange={(checked) => handleConfigChange('RESTRICTED_WEB', checked)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedCase?.title}
            </DialogTitle>
            <DialogDescription>
              Documentado por {selectedCase?.creator_name || 'Desconhecido'} em{' '}
              {selectedCase?.created_at && new Date(selectedCase.created_at).toLocaleDateString('pt-BR')}
            </DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selectedCase.equipment_type}</Badge>
                {selectedCase.brand && <Badge variant="outline">{selectedCase.brand}</Badge>}
                {selectedCase.model && <Badge variant="outline">{selectedCase.model}</Badge>}
                {selectedCase.difficulty_level && (
                  <Badge
                    variant="secondary"
                    className={
                      selectedCase.difficulty_level === 'easy'
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : selectedCase.difficulty_level === 'medium'
                        ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                        : 'bg-red-500/10 text-red-700 dark:text-red-400'
                    }
                  >
                    {selectedCase.difficulty_level === 'easy' && '🟢 Fácil'}
                    {selectedCase.difficulty_level === 'medium' && '🟡 Médio'}
                    {selectedCase.difficulty_level === 'hard' && '🔴 Difícil'}
                  </Badge>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Problema
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedCase.problem_description}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Solução
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedCase.solution_description}
                </p>
              </div>

              {selectedCase.tags && selectedCase.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCase.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedCase.estimated_time_minutes && (
                  <div>
                    <span className="font-medium">Tempo estimado:</span>{' '}
                    {selectedCase.estimated_time_minutes} min
                  </div>
                )}
                {selectedCase.estimated_cost && (
                  <div>
                    <span className="font-medium">Custo estimado:</span> R${' '}
                    {selectedCase.estimated_cost.toFixed(2)}
                  </div>
                )}
              </div>

              {selectedCase.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Observações</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedCase.notes}</p>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {selectedCase.view_count} visualizações
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    {selectedCase.helpful_count} úteis
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleMarkHelpful(selectedCase.id);
                    setViewDialogOpen(false);
                  }}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Marcar como Útil
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Caso</DialogTitle>
            <DialogDescription>Atualize as informações do caso documentado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={caseForm.title}
                onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-equipment">Tipo de Equipamento</Label>
              <Input
                id="edit-equipment"
                value={caseForm.equipment_type}
                onChange={(e) => setCaseForm({ ...caseForm, equipment_type: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-brand">Marca</Label>
                <Input
                  id="edit-brand"
                  value={caseForm.brand}
                  onChange={(e) => setCaseForm({ ...caseForm, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">Modelo</Label>
                <Input
                  id="edit-model"
                  value={caseForm.model}
                  onChange={(e) => setCaseForm({ ...caseForm, model: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-problem">Descrição do Problema</Label>
              <Textarea
                id="edit-problem"
                value={caseForm.problem_description}
                onChange={(e) => setCaseForm({ ...caseForm, problem_description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-solution">Solução Aplicada</Label>
              <Textarea
                id="edit-solution"
                value={caseForm.solution_description}
                onChange={(e) => setCaseForm({ ...caseForm, solution_description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-difficulty">Dificuldade</Label>
                <Select
                  value={caseForm.difficulty_level}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                    setCaseForm({ ...caseForm, difficulty_level: value })
                  }
                >
                  <SelectTrigger id="edit-difficulty">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Fácil</SelectItem>
                    <SelectItem value="medium">🟡 Médio</SelectItem>
                    <SelectItem value="hard">🔴 Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-time">Tempo (min)</Label>
                <Input
                  id="edit-time"
                  type="number"
                  value={caseForm.estimated_time_minutes || ''}
                  onChange={(e) =>
                    setCaseForm({
                      ...caseForm,
                      estimated_time_minutes: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cost">Custo (R$)</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  step="0.01"
                  value={caseForm.estimated_cost || ''}
                  onChange={(e) =>
                    setCaseForm({
                      ...caseForm,
                      estimated_cost: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                value={caseForm.notes}
                onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCase}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este caso da base de conhecimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCase} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AdminLayout>
  );
}
