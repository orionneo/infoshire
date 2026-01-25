import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Check, Clock, Loader2, Package, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatBox } from '@/components/ChatBox';
import { ClientLayout } from '@/components/layouts/ClientLayout';
import { OrderProgressTimeline } from '@/components/OrderProgressTimeline';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { OrderTimeline } from '@/components/OrderTimeline';
import { OrderImageGallery } from '@/components/orders/OrderImageGallery';
import WarrantyStatus from '@/components/WarrantyStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getOrderStatusHistory, getServiceOrder, getServiceOrderItems } from '@/db/api';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';
import type { ApprovalHistory, OrderStatusHistoryWithUser, ServiceOrderItem, ServiceOrderWithClient } from '@/types/types';

export default function ClientOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<ServiceOrderWithClient | null>(null);
  const [history, setHistory] = useState<OrderStatusHistoryWithUser[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [additionalItems, setAdditionalItems] = useState<ServiceOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
      loadHistory();
      loadApprovalHistory();
      loadAdditionalItems();
    }
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;
    
    try {
      const data = await getServiceOrder(id);
      setOrder(data);
    } catch (error) {
      console.error('Erro ao carregar ordem:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!id) return;
    
    try {
      const data = await getOrderStatusHistory(id);
      setHistory(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const loadAdditionalItems = async () => {
    if (!id) return;
    
    try {
      const data = await getServiceOrderItems(id);
      setAdditionalItems(data);
    } catch (error) {
      console.error('Erro ao carregar itens adicionais:', error);
    }
  };

  const loadApprovalHistory = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('approval_history')
        .select('*')
        .eq('order_id', id)
        .order('approved_at', { ascending: false });

      if (error) throw error;
      setApprovalHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de aprovações:', error);
    }
  };

  const handleApprove = async () => {
    if (!id || !order) return;
    
    setApproving(true);
    try {
      // Save to approval history
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          order_id: id,
          labor_cost: order.labor_cost,
          parts_cost: order.parts_cost,
          total_cost: order.total_cost,
          approved_at: new Date().toISOString(),
          notes: `Orçamento aprovado pelo cliente`,
        });

      if (historyError) throw historyError;

      // Update order
      const { error } = await supabase
        .from('service_orders')
        .update({
          budget_approved: true,
          approved_at: new Date().toISOString(),
          status: 'in_repair',
        })
        .eq('id', id);

      if (error) throw error;

      // Create status history entry with budget details
      const budgetDetails = `Mão de Obra: R$ ${order.labor_cost?.toFixed(2).replace('.', ',')} | Peças: R$ ${order.parts_cost?.toFixed(2).replace('.', ',')} | Total: R$ ${order.total_cost?.toFixed(2).replace('.', ',')}`;
      const { error: statusHistoryError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: id,
          status: 'in_repair',
          notes: `Orçamento aprovado pelo cliente - ${budgetDetails}`,
          created_by: order.client_id,
        });

      if (statusHistoryError) throw statusHistoryError;

      toast({
        title: 'Orçamento aprovado!',
        description: 'O reparo será iniciado em breve.',
      });

      // Reload order
      await loadOrder();
      await loadHistory();
      await loadApprovalHistory();
    } catch (error: any) {
      console.error('Erro ao aprovar orçamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar o orçamento',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!id || !order) return;
    
    setApproving(true);
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({
          budget_approved: false,
          status: 'received',
        })
        .eq('id', id);

      if (error) throw error;

      // Create status history entry
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: id,
          status: 'received',
          notes: 'Orçamento recusado pelo cliente',
          created_by: order.client_id,
        });

      if (historyError) throw historyError;

      toast({
        title: 'Orçamento recusado',
        description: 'O técnico será notificado.',
      });

      // Reload order
      await loadOrder();
      await loadHistory();
    } catch (error: any) {
      console.error('Erro ao recusar orçamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível recusar o orçamento',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
  }

  if (!order) {
    return (
      <ClientLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Ordem não encontrada</p>
            <Button onClick={() => navigate('/client')}>Voltar</Button>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/client')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">OS #{order.order_number}</h1>
            <p className="text-muted-foreground">{order.equipment}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Timeline de Progresso */}
        {order.entry_date && (
          <OrderProgressTimeline
            entryDate={order.entry_date}
            estimatedCompletion={order.estimated_completion}
            completedAt={order.completed_at}
            status={order.status}
            history={history}
            approvalHistory={approvalHistory}
          />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Equipamento</p>
                <p className="font-medium">{order.equipment}</p>
              </div>
              {order.serial_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Número de Série (S/N)</p>
                  <p className="font-medium font-mono text-sm">{order.serial_number}</p>
                </div>
              )}
              {order.has_multiple_items && additionalItems.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Equipamentos Adicionais</p>
                  <div className="space-y-2">
                    {additionalItems.map((item, index) => (
                      <div key={item.id} className="p-3 border rounded-lg bg-muted/30">
                        <p className="font-medium text-sm mb-1">Item {index + 1}: {item.equipment}</p>
                        {item.serial_number && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">S/N:</span> <span className="font-mono">{item.serial_number}</span>
                          </p>
                        )}
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {order.entry_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Data de Entrada</p>
                  <p className="font-medium">
                    {format(new Date(order.entry_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
              {order.equipment_photo_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Foto do Equipamento</p>
                  <img
                    src={order.equipment_photo_url}
                    alt="Foto do equipamento"
                    className="w-full rounded-lg border-2 border-border object-cover max-h-64"
                  />
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Problema</p>
                <p className="font-medium">{order.problem_description}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p className="font-medium">
                  {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              {order.estimated_completion && (
                <div>
                  <p className="text-sm text-muted-foreground">Previsão de Conclusão</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(new Date(order.estimated_completion), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
              {order.completed_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Concluído em</p>
                  <p className="font-medium">
                    {format(new Date(order.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
              
              {/* Budget Information */}
              {order.total_cost && order.total_cost > 0 && (
                <div className="pt-4 border-t space-y-3">
                  <h3 className="font-semibold text-lg">Orçamento</h3>
                  {order.labor_cost && order.labor_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Mão de Obra</span>
                      <span className="font-medium">R$ {order.labor_cost.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {order.parts_cost && order.parts_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Peças</span>
                      <span className="font-medium">R$ {order.parts_cost.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-xl text-primary">
                      R$ {order.total_cost.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {order.budget_notes && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm">{order.budget_notes}</p>
                    </div>
                  )}
                  
                  {/* Approval Buttons - Show only if awaiting approval */}
                  {order.status === 'awaiting_approval' && !order.budget_approved && (
                    <div className="pt-4 space-y-2">
                      <p className="text-sm font-medium text-center mb-3">
                        Deseja aprovar este orçamento?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleReject}
                          disabled={approving}
                        >
                          {approving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <X className="mr-2 h-4 w-4" />
                          )}
                          Recusar
                        </Button>
                        <Button
                          className="w-full"
                          onClick={handleApprove}
                          disabled={approving}
                        >
                          {approving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {order.budget_approved && order.approved_at && (
                    <div className="pt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Aprovado em {format(new Date(order.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Approval History */}
              {approvalHistory.length > 0 && (
                <div className="pt-4 border-t space-y-3">
                  <h3 className="font-semibold text-lg">Histórico de Aprovações</h3>
                  <div className="space-y-3">
                    {approvalHistory.map((approval, index) => (
                      <div key={approval.id} className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Aprovação #{approvalHistory.length - index}</span>
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-1 text-sm">
                          {approval.labor_cost && approval.labor_cost > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Mão de Obra</span>
                              <span>R$ {approval.labor_cost.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                          {approval.parts_cost && approval.parts_cost > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Peças</span>
                              <span>R$ {approval.parts_cost.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                          {approval.total_cost && (
                            <div className="flex justify-between font-semibold pt-1 border-t border-border">
                              <span>Total</span>
                              <span className="text-primary">R$ {approval.total_cost.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Aprovado em {format(new Date(approval.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                        {approval.notes && (
                          <div className="text-xs text-muted-foreground italic">
                            {approval.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Total Consolidado */}
                  {approvalHistory.length > 1 && (
                    <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">Total Consolidado</span>
                        <span className="font-bold text-2xl text-primary">
                          R$ {approvalHistory.reduce((sum, a) => sum + (a.total_cost || 0), 0).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Soma de todas as aprovações realizadas
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Componente de Status de Garantia */}
          <WarrantyStatus order={order} onUpdate={loadOrder} isAdmin={false} />

          <div className="xl:col-span-2">
            <Tabs defaultValue="timeline">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="timeline">Histórico</TabsTrigger>
                <TabsTrigger value="photos">Fotos</TabsTrigger>
                <TabsTrigger value="chat">Mensagens</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {history.length === 0 && approvalHistory.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhum histórico disponível
                      </p>
                    ) : (
                      <OrderTimeline history={history} approvalHistory={approvalHistory} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="photos">
                <OrderImageGallery orderId={order.id} isAdmin={false} />
              </TabsContent>
              <TabsContent value="chat">
                <ChatBox orderId={order.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
