import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Plus, Search, Trash2, UserPlus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { OrderStatusBadge, statusConfig } from '@/components/OrderStatusBadge';
import { AIOpeningAssistant } from '@/components/AIOpeningAssistant';
import WebSearchAssistant from '@/components/WebSearchAssistant';
import { OrderConfirmationDialog } from '@/components/OrderConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Input } from '@/components/ui/input';
import { MultipleImageUpload } from '@/components/ui/MultipleImageUpload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SmartInput } from '@/components/ui/SmartInput';
import { SmartTextarea } from '@/components/ui/SmartTextarea';
import { Textarea } from '@/components/ui/textarea';
import { createClientProfile, createServiceOrder, getAllProfiles, getAllServiceOrders, uploadOrderImage } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import type { Profile, ServiceOrderWithClient, OrderStatus } from '@/types/types';

// Chave para salvar o rascunho do formulário
const FORM_DRAFT_KEY = 'admin_order_form_draft';

export default function AdminOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [orders, setOrders] = useState<ServiceOrderWithClient[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ServiceOrderWithClient[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Ler filtros da URL ao carregar
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status && status !== 'all') {
      setStatusFilter(status);
    }
  }, [location.search]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [hasMultipleItems, setHasMultipleItems] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [additionalItems, setAdditionalItems] = useState<Array<{
    id: string;
    equipment: string;
    serial_number: string;
    description: string;
  }>>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  const form = useForm({
    defaultValues: {
      client_id: '',
      // New client fields
      new_client_first_name: '',
      new_client_last_name: '',
      new_client_email: '',
      new_client_phone: '',
      new_client_password: '123456',
      // Order fields
      equipment: '',
      serial_number: '',
      equipment_photo_url: '',
      problem_description: '',
      estimated_completion: '',
    },
  });

  // Restaurar rascunho do formulário ao abrir o diálogo
  useEffect(() => {
    if (dialogOpen) {
      try {
        const savedDraft = sessionStorage.getItem(FORM_DRAFT_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          form.reset(draft);
          toast({
            title: 'Rascunho restaurado',
            description: 'Seus dados foram recuperados automaticamente',
          });
        }
      } catch (error) {
        console.error('Erro ao restaurar rascunho:', error);
      }
    }
  }, [dialogOpen]);

  // Check if we should open dialog from navigation state
  useEffect(() => {
    if (location.state?.openDialog) {
      setDialogOpen(true);
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  // Auto-salvar formulário a cada mudança
  useEffect(() => {
    if (!dialogOpen) return;

    const subscription = form.watch((values) => {
      try {
        sessionStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(values));
      } catch (error) {
        console.error('Erro ao salvar rascunho:', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [dialogOpen, form]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const [ordersData, clientsData] = await Promise.all([
        getAllServiceOrders(),
        getAllProfiles(),
      ]);
      
      setOrders(ordersData);
      setClients(clientsData.filter(c => c.role === 'client'));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.client.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      // Handle special filters
      if (statusFilter === 'in_progress') {
        filtered = filtered.filter((order) => 
          ['analyzing', 'in_repair', 'awaiting_parts'].includes(order.status)
        );
      } else if (statusFilter === 'completed') {
        filtered = filtered.filter((order) => 
          ['completed', 'ready_for_pickup'].includes(order.status)
        );
      } else {
        filtered = filtered.filter((order) => order.status === statusFilter);
      }
    }

    setFilteredOrders(filtered);
  };

  // Funções para gerenciar itens adicionais
  const addAdditionalItem = () => {
    setAdditionalItems([
      ...additionalItems,
      {
        id: `temp-${Date.now()}`,
        equipment: '',
        serial_number: '',
        description: '',
      },
    ]);
  };

  const removeAdditionalItem = (id: string) => {
    setAdditionalItems(additionalItems.filter(item => item.id !== id));
  };

  const updateAdditionalItem = (id: string, field: string, value: string) => {
    setAdditionalItems(
      additionalItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const onSubmit = async (data: any) => {
    // Validações básicas antes de mostrar confirmação
    
    // Validar cliente
    if (!isNewClient && !data.client_id) {
      toast({
        title: 'Erro',
        description: 'Selecione um cliente ou marque "Novo Cliente"',
        variant: 'destructive',
      });
      return;
    }

    // Validar novo cliente
    if (isNewClient) {
      if (!data.new_client_first_name || !data.new_client_last_name || !data.new_client_email || !data.new_client_phone || !data.new_client_password) {
        toast({
          title: 'Erro',
          description: 'Preencha todos os campos obrigatórios do cliente',
          variant: 'destructive',
        });
        return;
      }

      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      if (!emailRegex.test(data.new_client_email)) {
        toast({
          title: 'Erro',
          description: 'E-mail inválido',
          variant: 'destructive',
        });
        return;
      }

      if (data.new_client_password.length < 6) {
        toast({
          title: 'Erro',
          description: 'A senha deve ter pelo menos 6 caracteres',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validar equipamento
    if (!data.equipment || data.equipment.trim().length === 0) {
      toast({
        title: 'Erro',
        description: 'Informe o equipamento',
        variant: 'destructive',
      });
      return;
    }

    // Validar descrição do problema
    if (!data.problem_description || data.problem_description.trim().length === 0) {
      toast({
        title: 'Erro',
        description: 'Descreva o problema relatado',
        variant: 'destructive',
      });
      return;
    }

    // Validar itens adicionais
    if (hasMultipleItems && additionalItems.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos um item adicional ou desmarque "Múltiplos equipamentos"',
        variant: 'destructive',
      });
      return;
    }

    if (hasMultipleItems) {
      const invalidItems = additionalItems.filter(item => !item.equipment.trim());
      if (invalidItems.length > 0) {
        toast({
          title: 'Erro',
          description: 'Preencha o nome do equipamento para todos os itens adicionais',
          variant: 'destructive',
        });
        return;
      }
    }

    // Todas as validações passaram - mostrar confirmação
    setPendingOrderData(data);
    setShowConfirmation(true);
  };

  const handleConfirmOrder = async () => {
    if (!pendingOrderData) return;
    
    const data = pendingOrderData;
    setCreating(true);
    
    try {
      let clientId = data.client_id;

      // Create new client if needed
      if (isNewClient) {
        // Combine first and last name
        const fullName = `${data.new_client_first_name.trim()} ${data.new_client_last_name.trim()}`;

        const newClient = await createClientProfile({
          name: fullName,
          email: data.new_client_email.trim(),
          phone: data.new_client_phone.trim(),
          password: data.new_client_password,
        });

        clientId = newClient.id;

        toast({
          title: 'Cliente criado',
          description: `Cliente ${newClient.name} cadastrado com sucesso`,
        });
      }

      // Criar data de entrada no timezone local (Brasil UTC-3)
      const now = new Date();
      const entryDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
      
      // Calcular data de previsão automática: 3 dias após a entrada (meio-dia UTC para evitar problemas de timezone)
      const estimatedDate = new Date(now);
      estimatedDate.setDate(estimatedDate.getDate() + 3);
      estimatedDate.setHours(12, 0, 0, 0); // Meio-dia UTC
      const autoEstimatedCompletion = estimatedDate.toISOString();
      
      const newOrder = await createServiceOrder({
        client_id: clientId,
        equipment: data.equipment,
        serial_number: data.serial_number || undefined,
        entry_date: entryDate, // Data/hora atual no timezone local
        equipment_photo_url: data.equipment_photo_url || undefined,
        problem_description: data.problem_description,
        estimated_completion: autoEstimatedCompletion, // Sempre 3 dias após entrada
        has_multiple_items: hasMultipleItems,
        items: hasMultipleItems ? additionalItems.map(item => ({
          equipment: item.equipment,
          serial_number: item.serial_number || undefined,
          description: item.description || undefined,
        })) : undefined,
      });

      // Upload múltiplas fotos se houver
      if (selectedImages.length > 0) {
        try {
          await Promise.all(
            selectedImages.map((file, index) => 
              uploadOrderImage(newOrder.id, file, `Foto ${index + 1}`)
            )
          );
          toast({
            title: 'Fotos enviadas',
            description: `${selectedImages.length} foto(s) enviada(s) com sucesso`,
          });
        } catch (error) {
          console.error('Erro ao enviar fotos:', error);
          toast({
            title: 'Aviso',
            description: 'OS criada, mas houve erro ao enviar algumas fotos',
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Ordem criada',
        description: `OS #${newOrder.order_number} criada com sucesso`,
      });

      // Limpar rascunho salvo
      sessionStorage.removeItem(FORM_DRAFT_KEY);
      
      // Fechar ambos os diálogos
      setShowConfirmation(false);
      setDialogOpen(false);
      
      // Limpar estados
      form.reset();
      setIsNewClient(false);
      setHasMultipleItems(false);
      setAdditionalItems([]);
      setSelectedImages([]);
      setPendingOrderData(null);
      
      // Recarregar dados
      loadData();
    } catch (error: any) {
      console.error('Erro ao criar ordem:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a ordem',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Ordens de Serviço</h1>
            <p className="text-muted-foreground">Gerencie todas as ordens de serviço</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Ordem
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Ordem de Serviço</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Client Selection or New Client */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Cliente</h3>
                      <Button
                        type="button"
                        variant={isNewClient ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsNewClient(!isNewClient)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {isNewClient ? 'Selecionar Existente' : 'Novo Cliente'}
                      </Button>
                    </div>

                    {!isNewClient ? (
                      <FormField
                        control={form.control}
                        name="client_id"
                        rules={{ required: 'Cliente é obrigatório' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Selecionar Cliente</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients.map((client) => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.name || client.email} {client.phone && `- ${client.phone}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="space-y-4 p-4 border border-primary/30 rounded-lg bg-card/50">
                        <p className="text-sm text-muted-foreground">
                          Cadastre um novo cliente para criar a ordem de serviço
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="new_client_first_name"
                            rules={{ required: isNewClient ? 'Nome é obrigatório' : false }}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome *</FormLabel>
                                <FormControl>
                                  <Input placeholder="João" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="new_client_last_name"
                            rules={{ required: isNewClient ? 'Sobrenome é obrigatório' : false }}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sobrenome *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Silva" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="new_client_email"
                          rules={{
                            required: isNewClient ? 'E-mail é obrigatório' : false,
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'E-mail inválido',
                            },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-mail *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="cliente@email.com" {...field} />
                              </FormControl>
                              <FormDescription>
                                O cliente usará este e-mail para fazer login
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="new_client_phone"
                          rules={{ required: isNewClient ? 'Telefone é obrigatório' : false }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone *</FormLabel>
                              <FormControl>
                                <Input placeholder="(11) 99999-9999" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="new_client_password"
                          rules={{
                            required: isNewClient ? 'Senha é obrigatória' : false,
                            minLength: {
                              value: 6,
                              message: 'A senha deve ter pelo menos 6 caracteres',
                            },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha *</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                              </FormControl>
                              <FormDescription>
                                Senha para o cliente acessar o sistema
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Order Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Detalhes da Ordem</h3>
                    <FormField
                      control={form.control}
                      name="equipment"
                      rules={{ required: 'Equipamento é obrigatório' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipamento</FormLabel>
                          <FormControl>
                            <SmartInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Ex: Notebook, Celular, Computador..."
                            />
                          </FormControl>
                          <FormDescription>
                            Use as sugestões ou digite o equipamento
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Série (S/N)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: ABC123456789" {...field} />
                          </FormControl>
                          <FormDescription>
                            Número de série do equipamento (opcional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Múltiplas fotos do equipamento */}
                    <div className="space-y-2">
                      <FormLabel>Fotos do Equipamento</FormLabel>
                      <MultipleImageUpload
                        onImagesChange={setSelectedImages}
                        maxImages={10}
                      />
                      <FormDescription>
                        Adicione múltiplas fotos do equipamento (opcional, máximo 10 fotos)
                      </FormDescription>
                    </div>

                    {/* Checkbox para múltiplos equipamentos */}
                    <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/30">
                      <Checkbox
                        id="has_multiple_items"
                        checked={hasMultipleItems}
                        onCheckedChange={(checked) => {
                          setHasMultipleItems(checked as boolean);
                          if (!checked) {
                            setAdditionalItems([]);
                          }
                        }}
                      />
                      <label
                        htmlFor="has_multiple_items"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Cliente trouxe múltiplos equipamentos/itens
                      </label>
                    </div>

                    {/* Seção de itens adicionais */}
                    {hasMultipleItems && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Equipamentos Adicionais</h4>
                            <p className="text-sm text-muted-foreground">
                              Adicione outros equipamentos/periféricos que o cliente trouxe
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addAdditionalItem}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Item
                          </Button>
                        </div>

                        {additionalItems.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhum item adicional. Clique em "Adicionar Item" para começar.
                          </p>
                        )}

                        {additionalItems.map((item, index) => (
                          <div key={item.id} className="space-y-3 p-4 border rounded-lg bg-background">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium text-sm">Item {index + 1}</h5>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAdditionalItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium">Equipamento *</label>
                                <Input
                                  placeholder="Ex: Mouse, Teclado, Monitor"
                                  value={item.equipment}
                                  onChange={(e) => updateAdditionalItem(item.id, 'equipment', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Número de Série (S/N)</label>
                                <Input
                                  placeholder="Ex: SN123456"
                                  value={item.serial_number}
                                  onChange={(e) => updateAdditionalItem(item.id, 'serial_number', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Descrição/Observações</label>
                                <Textarea
                                  placeholder="Ex: Mouse sem fio preto, com defeito no botão direito"
                                  value={item.description}
                                  onChange={(e) => updateAdditionalItem(item.id, 'description', e.target.value)}
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="problem_description"
                      rules={{ required: 'Descrição do problema é obrigatória' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do Problema</FormLabel>
                          <FormControl>
                            <SmartTextarea
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Descreva o problema relatado pelo cliente"
                              rows={5}
                              enableVoiceInput={true}
                            />
                          </FormControl>
                          <FormDescription>
                            Use as sugestões rápidas, digite livremente ou use o microfone para transcrever por voz. O sistema aprende com suas descrições.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* AI Opening Assistant */}
                    <AIOpeningAssistant
                      problemDescription={form.watch('problem_description')}
                      equipment={form.watch('equipment')}
                      enabled={aiAssistantEnabled}
                      onToggle={setAiAssistantEnabled}
                      onApplyDescription={(description) => {
                        form.setValue('problem_description', description);
                      }}
                    />

                    {/* Web Search Assistant */}
                    <WebSearchAssistant
                      context="abertura_os"
                      placeholder="Ex: Samsung Galaxy S21 problemas comuns de bateria"
                      title="🔍 Buscar Informações Técnicas"
                      description="Busque especificações, problemas comuns e informações técnicas na web"
                      onApplyResult={(insights) => {
                        // Adicionar insights ao campo de descrição de forma inteligente
                        const currentDesc = form.watch('problem_description') || '';
                        let newDesc = currentDesc;
                        
                        if (currentDesc.trim()) {
                          // Se já tem conteúdo, adiciona os insights como referência
                          newDesc = `${currentDesc}\n\n📋 Referências:\n${insights}`;
                        } else {
                          // Se está vazio, usa os insights diretamente
                          newDesc = insights;
                        }
                        
                        form.setValue('problem_description', newDesc);
                      }}
                    />
                    
                    {/* Informação sobre data de previsão automática */}
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        ℹ️ A data de previsão será automaticamente definida para <strong>3 dias após a entrada</strong>. Você poderá ajustá-la posteriormente na página de detalhes da ordem.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setIsNewClient(false);
                        form.reset();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={creating || showConfirmation}>
                      Revisar e Confirmar
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg xl:text-xl">Filtros por Status</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="xl:hidden gap-1"
              >
                {filtersExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span className="text-xs">Menos</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span className="text-xs">Mais</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Filtros principais - Sempre visíveis */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {/* Botão Todos */}
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="shrink-0 h-16 min-w-[64px] p-2 flex flex-col items-center justify-center gap-1.5"
              >
                <span className="text-2xl">📋</span>
                <span className="text-xs font-bold leading-none">{orders.length}</span>
              </Button>
              
              {/* Filtros principais - Apenas os mais importantes */}
              {(['received', 'analyzing', 'awaiting_approval', 'in_repair', 'ready_for_pickup', 'completed'] as OrderStatus[]).map((status) => {
                const config = statusConfig[status];
                const count = orders.filter(o => o.status === status).length;
                const isActive = statusFilter === status;
                
                return (
                  <Button
                    key={status}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className="shrink-0 h-16 min-w-[64px] p-2 flex flex-col items-center justify-center gap-1.5"
                    style={
                      !isActive
                        ? {
                            borderColor: config.borderColor.includes('blue') ? '#3b82f6' :
                                       config.borderColor.includes('purple') ? '#a855f7' :
                                       config.borderColor.includes('yellow') ? '#eab308' :
                                       config.borderColor.includes('cyan') ? '#06b6d4' :
                                       config.borderColor.includes('red') ? '#ef4444' :
                                       config.borderColor.includes('orange') ? '#f97316' :
                                       config.borderColor.includes('amber') ? '#f59e0b' :
                                       config.borderColor.includes('green') ? '#22c55e' :
                                       config.borderColor.includes('sky') ? '#0ea5e9' : undefined,
                            borderWidth: '2px'
                          }
                        : undefined
                    }
                  >
                    <span className="text-2xl">{config.icon}</span>
                    <span className="text-xs font-bold leading-none">{count}</span>
                  </Button>
                );
              })}
            </div>

            {/* Filtros adicionais - Expansível no mobile, sempre visível no desktop */}
            <div className={`${filtersExpanded ? 'block' : 'hidden xl:block'}`}>
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
                {(Object.keys(statusConfig) as OrderStatus[]).map((status) => {
                  const config = statusConfig[status];
                  const count = orders.filter(o => o.status === status).length;
                  const isActive = statusFilter === status;
                  
                  // Labels curtos
                  const shortLabels: Record<OrderStatus, string> = {
                    received: 'Recebido',
                    analyzing: 'Análise',
                    awaiting_approval: 'Aguard. Aprov.',
                    approved: 'Aprovado',
                    not_approved: 'Cancelado',
                    in_repair: 'Reparo',
                    awaiting_parts: 'Aguard. Peças',
                    ready_for_pickup: 'Pronto',
                    completed: 'Finalizado',
                  };
                  
                  return (
                    <Button
                      key={status}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className="h-auto py-3 px-2 flex flex-col items-center justify-center gap-1.5 text-center"
                      style={
                        !isActive
                          ? {
                              borderColor: config.borderColor.includes('blue') ? '#3b82f6' :
                                         config.borderColor.includes('purple') ? '#a855f7' :
                                         config.borderColor.includes('yellow') ? '#eab308' :
                                         config.borderColor.includes('cyan') ? '#06b6d4' :
                                         config.borderColor.includes('red') ? '#ef4444' :
                                         config.borderColor.includes('orange') ? '#f97316' :
                                         config.borderColor.includes('amber') ? '#f59e0b' :
                                         config.borderColor.includes('green') ? '#22c55e' :
                                         config.borderColor.includes('sky') ? '#0ea5e9' : undefined,
                              borderWidth: '2px'
                            }
                          : undefined
                      }
                    >
                      <span className="text-xl">{config.icon}</span>
                      <span className="text-xs font-semibold leading-tight">
                        {shortLabels[status]}
                      </span>
                      <span className="text-xs font-bold opacity-70">
                        {count}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barra de busca e lista de ordens */}
        <Card>
          <CardHeader>
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, equipamento ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {statusFilter !== 'all' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar Filtro
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma ordem encontrada
              </p>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium">OS #{order.order_number}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{order.equipment}</p>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {order.client.name || order.client.email}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Confirmation Dialog */}
      <OrderConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        data={{
          client: pendingOrderData?.client_id ? clients.find(c => c.id === pendingOrderData.client_id) : undefined,
          isNewClient,
          newClientData: isNewClient ? {
            first_name: pendingOrderData?.new_client_first_name || '',
            last_name: pendingOrderData?.new_client_last_name || '',
            email: pendingOrderData?.new_client_email || '',
            phone: pendingOrderData?.new_client_phone || '',
          } : undefined,
          equipment: pendingOrderData?.equipment || '',
          serial_number: pendingOrderData?.serial_number,
          problem_description: pendingOrderData?.problem_description || '',
          equipment_photo_url: pendingOrderData?.equipment_photo_url,
          hasMultipleItems,
          additionalItems,
          selectedImages,
        }}
        onConfirm={handleConfirmOrder}
        loading={creating}
      />
    </AdminLayout>
  );
}
