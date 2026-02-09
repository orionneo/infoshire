import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Loader2, Package, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/db/supabase';
import type { ServiceOrderWithClient } from '@/types/types';

export default function BudgetApproval() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<ServiceOrderWithClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadOrder();
    }
  }, [token]);

  const loadOrder = async () => {
    if (!token) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('service_orders')
        .select(`
          *,
          client:profiles!service_orders_client_id_fkey(*)
        `)
        .eq('approval_token', token)
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Orçamento não encontrado ou link inválido.');
        return;
      }

      // Check if already approved
      if (data.budget_approved) {
        setApproved(true);
      }

      setOrder(data as ServiceOrderWithClient);
    } catch (err) {
      console.error('Erro ao carregar orçamento:', err);
      setError('Erro ao carregar orçamento. Verifique o link e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!order || !token) return;

    setApproving(true);
    setError(null);

    try {
      const subtotal = (order.labor_cost || 0) + (order.parts_cost || 0);
      const discountAmount = order.discount_amount || 0;
      const totalFinal = Math.max(subtotal - discountAmount, 0);

      // Save to approval history first
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          order_id: order.id,
          labor_cost: order.labor_cost,
          parts_cost: order.parts_cost,
          total_cost: order.total_cost,
          subtotal_cost: subtotal,
          discount_amount: discountAmount,
          discount_reason: order.discount_reason,
          total_final_cost: totalFinal,
          approved_at: new Date().toISOString(),
          notes: 'Orçamento aprovado pelo cliente via link de aprovação',
          admin_notified: false, // Admin needs to be notified
          admin_viewed: false, // Admin hasn't viewed yet
        });

      if (historyError) throw historyError;

      // Update order status and approval
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          budget_approved: true,
          approved_at: new Date().toISOString(),
          status: 'in_repair',
        })
        .eq('approval_token', token);

      if (updateError) throw updateError;

      // Create status history entry with budget details
      const budgetDetails = `Mão de Obra: R$ ${order.labor_cost?.toFixed(2).replace('.', ',')} | Peças: R$ ${order.parts_cost?.toFixed(2).replace('.', ',')} | Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')} | Desconto: R$ ${discountAmount.toFixed(2).replace('.', ',')} | Total final: R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
      const { error: statusError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: order.id,
          status: 'in_repair',
          notes: `Orçamento aprovado pelo cliente via link - ${budgetDetails}`,
          created_by: order.client_id,
        });

      if (statusError) throw statusError;

      // Send Telegram notification to admin
      try {
        const { error: telegramError } = await supabase.functions.invoke('send-telegram-notification', {
          body: {
            orderNumber: order.order_number,
            equipment: order.equipment,
            clientName: order.client?.name || 'Cliente',
            totalCost: order.total_cost,
            laborCost: order.labor_cost,
            partsCost: order.parts_cost,
            notificationType: 'approved',
          },
        });

        if (telegramError) {
          const errorMsg = await telegramError?.context?.text?.();
          console.error('Erro ao enviar notificação do Telegram:', errorMsg || telegramError?.message || telegramError);
          // Don't throw error, just log it - approval was successful
        }
      } catch (telegramErr) {
        console.error('Erro ao enviar notificação do Telegram:', telegramErr);
        // Don't throw error, just log it - approval was successful
      }

      setApproved(true);
    } catch (err) {
      console.error('Erro ao aprovar orçamento:', err);
      setError('Erro ao aprovar orçamento. Tente novamente.');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!order || !token) return;

    setRejecting(true);
    setError(null);

    try {
      // Update order status
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          budget_approved: false,
          status: 'in_analysis',
        })
        .eq('approval_token', token);

      if (updateError) throw updateError;

      // Create status history entry
      const { error: statusError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: order.id,
          status: 'in_analysis',
          notes: 'Orçamento recusado pelo cliente via link',
          created_by: order.client_id,
        });

      if (statusError) throw statusError;

      setRejected(true);
    } catch (err) {
      console.error('Erro ao recusar orçamento:', err);
      setError('Erro ao recusar orçamento. Tente novamente.');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando orçamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">Erro</p>
            <p className="text-muted-foreground text-center">
              {error || 'Orçamento não encontrado'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (approved || order.budget_approved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-500">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-2xl font-bold mb-2 text-green-600 dark:text-green-400">
              Orçamento Aprovado!
            </p>
            <p className="text-muted-foreground text-center mb-6">
              Seu orçamento foi aprovado com sucesso. O técnico já foi notificado e dará continuidade ao reparo.
            </p>
            {order.approved_at && (
              <p className="text-sm text-muted-foreground mb-6">
                Aprovado em: {format(new Date(order.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full max-w-xs"
              size="lg"
            >
              Voltar ao Site
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (rejected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <p className="text-2xl font-bold mb-2 text-destructive">
              Orçamento Recusado
            </p>
            <p className="text-muted-foreground text-center mb-6">
              O orçamento foi recusado. O técnico será notificado e entrará em contato para discutir outras opções.
            </p>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full max-w-xs"
              size="lg"
            >
              Voltar ao Site
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Package className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Aprovação de Orçamento</CardTitle>
          <CardDescription>
            Ordem de Serviço #{order.order_number}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações do Equipamento */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-lg">Informações do Equipamento</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Equipamento</p>
                <p className="font-medium">{order.equipment}</p>
              </div>
              {order.serial_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Número de Série</p>
                  <p className="font-medium font-mono text-sm">{order.serial_number}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Problema Relatado</p>
                <p className="font-medium">{order.problem_description}</p>
              </div>
            </div>
          </div>

          {/* Detalhamento do Orçamento */}
          <div className="space-y-4 p-4 bg-primary/5 rounded-lg border-2 border-primary">
            <h3 className="font-semibold text-lg">Detalhamento do Orçamento</h3>
            
            <div className="space-y-3">
              {order.labor_cost !== null && order.labor_cost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mão de Obra</span>
                  <span className="font-semibold text-lg">
                    R$ {order.labor_cost.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}
              
              {order.parts_cost !== null && order.parts_cost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Peças</span>
                  <span className="font-semibold text-lg">
                    R$ {order.parts_cost.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-primary/30">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-lg">
                  R$ {((order.labor_cost || 0) + (order.parts_cost || 0)).toFixed(2).replace('.', ',')}
                </span>
              </div>

              {(order.discount_amount || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="font-semibold text-lg text-orange-600">
                    - R$ {(order.discount_amount || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}
              
              <div className="pt-3 border-t-2 border-primary/30">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total Final</span>
                  <span className="font-bold text-2xl text-primary">
                    R$ {Math.max(((order.labor_cost || 0) + (order.parts_cost || 0)) - (order.discount_amount || 0), 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>

            {order.budget_notes && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{order.budget_notes}</p>
              </div>
            )}
          </div>

          {/* Informações do Cliente */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold">Informações do Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{order.client.name}</p>
              </div>
              {order.client.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{order.client.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleReject}
                disabled={approving || rejecting}
                variant="outline"
                className="w-full h-12 text-lg border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                size="lg"
              >
                {rejecting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Recusando...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-5 w-5" />
                    Recusar
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleApprove}
                disabled={approving || rejecting}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {approving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Aprovando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Aprovar
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Ao aprovar, você autoriza o início do reparo conforme o orçamento apresentado.
              O técnico será notificado imediatamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
