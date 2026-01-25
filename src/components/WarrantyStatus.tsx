import { Shield, CheckCircle, AlertCircle, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ServiceOrder } from '@/types/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { markAsWarrantyReturn, updateOrderPickupDate } from '@/db/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface WarrantyStatusProps {
  order: ServiceOrder;
  onUpdate?: () => void;
  isAdmin?: boolean;
}

export default function WarrantyStatus({ order, onUpdate, isAdmin = false }: WarrantyStatusProps) {
  const { toast } = useToast();
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState(
    format(new Date(), "yyyy-MM-dd'T'12:00:00.000'Z'")
  );
  const [loading, setLoading] = useState(false);

  // Calcular dias restantes de garantia
  const calculateDaysRemaining = (): number => {
    if (!order.data_fim_garantia) return 0;
    const now = new Date();
    const end = new Date(order.data_fim_garantia);
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = calculateDaysRemaining();
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  // Marcar/desmarcar como retorno de garantia
  const handleToggleWarrantyReturn = async () => {
    setLoading(true);
    try {
      await markAsWarrantyReturn(order.id, !order.retorno_garantia);
      toast({
        title: 'Atualizado com sucesso',
        description: order.retorno_garantia
          ? 'OS desmarcada como retorno de garantia'
          : 'OS marcada como retorno de garantia',
      });
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status de retorno de garantia',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Registrar data de retirada
  const handleRegisterPickup = async () => {
    setLoading(true);
    try {
      await updateOrderPickupDate(order.id, pickupDate);
      toast({
        title: 'Data de retirada registrada',
        description: 'A data de retirada foi registrada com sucesso',
      });
      setPickupDialogOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao registrar retirada:', error);
      toast({
        title: 'Erro ao registrar',
        description: 'Não foi possível registrar a data de retirada',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Se não há informações de garantia, não renderizar
  if (!order.data_fim_garantia && !order.data_conclusao) {
    return null;
  }

  return (
    <Card className={order.em_garantia ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Informações de Garantia
          {order.em_garantia ? (
            <Badge className="bg-green-500 hover:bg-green-600 ml-auto">
              <CheckCircle className="w-3 h-3 mr-1" />
              Em garantia
            </Badge>
          ) : order.data_fim_garantia ? (
            <Badge variant="destructive" className="ml-auto">
              <AlertCircle className="w-3 h-3 mr-1" />
              Garantia expirada
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Datas importantes */}
        <div className="grid gap-3 xl:grid-cols-2">
          {order.data_conclusao && (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Data de Conclusão</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.data_conclusao), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          )}

          {order.data_retirada && (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Data de Retirada</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.data_retirada), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          )}

          {order.data_fim_garantia && (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Fim da Garantia</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.data_fim_garantia), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          )}

          {order.em_garantia && (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Dias Restantes</p>
                <p className={`text-lg font-bold ${isExpiringSoon ? 'text-orange-600' : 'text-green-600'}`}>
                  {daysRemaining} dia(s)
                </p>
                {isExpiringSoon && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Garantia expira em breve
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Informações adicionais */}
        {order.retorno_garantia && (
          <>
            <Separator />
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Retorno de Garantia
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Esta OS é um retorno de garantia de um serviço anterior
                </p>
              </div>
            </div>
          </>
        )}

        {/* Ações do admin */}
        {isAdmin && (
          <>
            <Separator />
            <div className="flex flex-col xl:flex-row gap-2">
              {!order.data_retirada && order.status === 'ready_for_pickup' && (
                <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      Registrar Retirada
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Data de Retirada</DialogTitle>
                      <DialogDescription>
                        Informe a data e hora em que o cliente retirou o equipamento
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="pickupDate">Data e Hora da Retirada</Label>
                        <Input
                          id="pickupDate"
                          type="datetime-local"
                          value={pickupDate.replace('.000Z', '').replace('T12:00:00', 'T' + format(new Date(), 'HH:mm'))}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPickupDate(value + ':00.000Z');
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setPickupDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleRegisterPickup} disabled={loading}>
                        {loading ? 'Salvando...' : 'Registrar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Button
                variant={order.retorno_garantia ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleToggleWarrantyReturn}
                disabled={loading}
                className="flex-1"
              >
                <Clock className="w-4 h-4 mr-2" />
                {order.retorno_garantia ? 'Desmarcar Retorno' : 'Marcar como Retorno'}
              </Button>
            </div>
          </>
        )}

        {/* Informação sobre garantia padrão */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <p className="font-medium mb-1">ℹ️ Sobre a Garantia</p>
          <p>
            Garantia padrão de 90 dias a partir da data de conclusão do serviço. 
            {order.em_garantia && ' O cliente pode retornar com o equipamento sem custo adicional durante este período.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
