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
      const { data, error: fetchError } = await supabase.rpc('get_budget_approval_order', {
        p_token: token,
      });

      if (fetchError) throw fetchError;

      if (!data) {
        setError('OrÃ§amento nÃ£o encontrado ou link invÃ¡lido.');
        return;
      }

      if (data.budget_approved) {
        setApproved(true);
      }

      setOrder(data as ServiceOrderWithClient);
    } catch (err) {
      console.error('Erro ao carregar orÃ§amento:', err);
      setError('Erro ao carregar orÃ§amento. Verifique o link e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!order || !token) return;

    setApproving(true);
    setError(null);

    try {
      const { data: updatedOrder, error: approvalError } = await supabase.rpc('submit_budget_approval', {
        p_token: token,
        p_approved: true,
      });

      if (approvalError) throw approvalError;
      if (updatedOrder) setOrder(updatedOrder as ServiceOrderWithClient);

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
          console.error('Erro ao enviar notificaÃ§Ã£o do Telegram:', errorMsg || telegramError?.message || telegramError);
        }
      } catch (telegramErr) {
        console.error('Erro ao enviar notificaÃ§Ã£o do Telegram:', telegramErr);
      }

      setApproved(true);
    } catch (err) {
      console.error('Erro ao aprovar orÃ§amento:', err);
      setError('Erro ao aprovar orÃ§amento. Tente novamente.');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!order || !token) return;

    setRejecting(true);
    setError(null);

    try {
      const { data: updatedOrder, error: rejectionError } = await supabase.rpc('submit_budget_approval', {
        p_token: token,
        p_approved: false,
      });

      if (rejectionError) throw rejectionError;
      if (updatedOrder) setOrder(updatedOrder as ServiceOrderWithClient);
      setRejected(true);
    } catch (err) {
      console.error('Erro ao recusar orÃ§amento:', err);
      setError('Erro ao recusar orÃ§amento. Tente novamente.');
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
            <p className="text-muted-foreground">Carregando orÃ§amento...</p>
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
              {error || 'OrÃ§amento nÃ£o encontrado'}
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
              OrÃ§amento Aprovado!
            </p>
            <p className="text-muted-foreground text-center mb-6">
              Seu orÃ§amento foi aprovado com sucesso. O tÃ©cnico jÃ¡ foi notificado e darÃ¡ continuidade ao reparo.
            </p>
            {order.approved_at && (
              <p className="text-sm text-muted-foreground mb-6">
                Aprovado em: {format(new Date(order.approved_at), "dd/MM/yyyy 'Ã s' HH:mm", { locale: ptBR })}
              </p>
            )}
            <Button onClick={() => window.location.href = '/'} className="w-full max-w-xs" size="lg">
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
            <p className="text-2xl font-bold mb-2 text-destructive">OrÃ§amento Recusado</p>
            <p className="text-muted-foreground text-center mb-6">
              O orÃ§amento foi recusado. O tÃ©cnico serÃ¡ notificado e entrarÃ¡ em contato para discutir outras opÃ§Ãµes.
            </p>
            <Button onClick={() => window.location.href = '/'} variant="outline" className="w-full max-w-xs" size="lg">
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
          <CardTitle className="text-2xl">AprovaÃ§Ã£o de OrÃ§amento</CardTitle>
          <CardDescription>Ordem de ServiÃ§o #{order.order_number}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-lg">InformaÃ§Ãµes do Equipamento</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Equipamento</p>
                <p className="font-medium">{order.equipment}</p>
              </div>
              {order.serial_number && (
                <div>
                  <p className="text-sm text-muted-foreground">NÃºmero de SÃ©rie</p>
                  <p className="font-medium font-mono text-sm">{order.serial_number}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Problema Relatado</p>
                <p className="font-medium">{order.problem_description}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-primary/5 rounded-lg border-2 border-primary">
            <h3 className="font-semibold text-lg">Detalhamento do OrÃ§amento</h3>
            <div className="space-y-3">
              {order.labor_cost !== null && order.labor_cost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">MÃ£o de Obra</span>
                  <span className="font-semibold text-lg">R$ {order.labor_cost.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              {order.parts_cost !== null && order.parts_cost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">PeÃ§as</span>
                  <span className="font-semibold text-lg">R$ {order.parts_cost.toFixed(2).replace('.', ',')}</span>
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
                <p className="text-sm text-muted-foreground mb-1">ObservaÃ§Ãµes</p>
                <p className="text-sm">{order.budget_notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold">InformaÃ§Ãµes do Cliente</h3>
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

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={handleReject} disabled={approving || rejecting} variant="outline" className="w-full h-12 text-lg border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" size="lg">
                {rejecting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Recusando...</>) : (<><XCircle className="mr-2 h-5 w-5" />Recusar</>)}
              </Button>
              <Button onClick={handleApprove} disabled={approving || rejecting} className="w-full h-12 text-lg" size="lg">
                {approving ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Aprovando...</>) : (<><CheckCircle2 className="mr-2 h-5 w-5" />Aprovar</>)}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Ao aprovar, vocÃª autoriza o inÃ­cio do reparo conforme o orÃ§amento apresentado. O tÃ©cnico serÃ¡ notificado imediatamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
