import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Package,
  CheckCircle2,
  AlertCircle,
  Shield,
  User,
  Mail,
  Phone,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getPublicOrderStatusHistory } from '@/db/api';
import type { PublicOrderInfo } from '@/types/types';

interface PublicOrderDetailsProps {
  order: PublicOrderInfo;
}

export default function PublicOrderDetails({ order }: PublicOrderDetailsProps) {
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatusHistory();
  }, [order.id]);

  const loadStatusHistory = async () => {
    try {
      const history = await getPublicOrderStatusHistory(order.id);
      setStatusHistory(history);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não definido';
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return 'Não definido';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      received: { label: 'Recebido', color: 'bg-blue-500/10 text-blue-500', icon: Package },
      analyzing: { label: 'Em Análise', color: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
      awaiting_approval: { label: 'Aguardando Aprovação', color: 'bg-orange-500/10 text-orange-500', icon: AlertCircle },
      approved: { label: 'Aprovado', color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
      not_approved: { label: 'Não Aprovado', color: 'bg-red-500/10 text-red-500', icon: AlertCircle },
      in_repair: { label: 'Em Reparo', color: 'bg-purple-500/10 text-purple-500', icon: Clock },
      awaiting_parts: { label: 'Aguardando Peças', color: 'bg-amber-500/10 text-amber-500', icon: Package },
      completed: { label: 'Concluído', color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
      ready_for_pickup: { label: 'Pronto para Retirada', color: 'bg-primary/10 text-primary', icon: CheckCircle2 },
    };
    return statusMap[status] || { label: status, color: 'bg-muted text-muted-foreground', icon: FileText };
  };

  const currentStatus = getStatusInfo(order.status);
  const StatusIcon = currentStatus.icon;

  return (
    <div className="space-y-6">
      {/* Header com status atual */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl xl:text-3xl">OS #{order.order_number}</CardTitle>
              <CardDescription className="mt-2">
                Criada em {formatDateShort(order.created_at)}
              </CardDescription>
            </div>
            <Badge className={`${currentStatus.color} px-4 py-2 text-sm`}>
              <StatusIcon className="h-4 w-4 mr-2" />
              {currentStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informações do equipamento */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Equipamento
            </h3>
            <p className="text-muted-foreground">{order.equipment}</p>
          </div>

          <Separator />

          {/* Descrição do problema */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Problema Relatado
            </h3>
            <p className="text-muted-foreground">{order.problem_description}</p>
          </div>

          <Separator />

          {/* Datas importantes */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {order.entry_date && (
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  Data de Entrada
                </h3>
                <p className="text-sm text-muted-foreground">{formatDateShort(order.entry_date)}</p>
              </div>
            )}

            {order.estimated_completion && (
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Previsão de Conclusão
                </h3>
                <p className="text-sm text-muted-foreground">{formatDateShort(order.estimated_completion)}</p>
              </div>
            )}

            {order.completed_at && (
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Data de Conclusão
                </h3>
                <p className="text-sm text-muted-foreground">{formatDateShort(order.completed_at)}</p>
              </div>
            )}
          </div>

          {/* Informações de garantia */}
          {order.em_garantia && order.data_fim_garantia && (
            <>
              <Separator />
              <div className="bg-primary/5 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-primary">
                  <Shield className="h-4 w-4" />
                  Garantia Ativa
                </h3>
                <p className="text-sm text-muted-foreground">
                  Válida até {formatDateShort(order.data_fim_garantia)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Informações do cliente (parcialmente ocultas) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{order.client_name}</span>
          </div>
          
          {order.client_email_masked && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{order.client_email_masked}</span>
            </div>
          )}
          
          {order.client_phone_masked && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{order.client_phone_masked}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline de status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Atualizações</CardTitle>
          <CardDescription>
            Acompanhe todas as mudanças de status da sua ordem de serviço
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          ) : statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atualização registrada ainda.</p>
          ) : (
            <div className="space-y-4">
              {statusHistory.map((item, index) => {
                const statusInfo = getStatusInfo(item.status);
                const ItemIcon = statusInfo.icon;
                const isLast = index === statusHistory.length - 1;

                return (
                  <div key={item.id} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`rounded-full p-2 ${statusInfo.color}`}>
                        <ItemIcon className="h-4 w-4" />
                      </div>
                      {!isLast && (
                        <div className="w-0.5 h-full min-h-[40px] bg-border mt-2" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <p className="font-semibold">{statusInfo.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(item.created_at)}
                      </p>
                      {item.profiles && (
                        <p className="text-xs text-muted-foreground mt-1">
                          👤 Por: <span className="font-medium">{item.profiles.name || item.profiles.email}</span>
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aviso sobre recursos completos */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-sm text-center">
            💡 <strong>Dica:</strong> Faça login para acessar recursos completos como troca de mensagens com o técnico, 
            visualização de fotos do equipamento e histórico detalhado de todas as suas ordens de serviço.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
