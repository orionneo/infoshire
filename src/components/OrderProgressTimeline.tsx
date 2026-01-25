import { differenceInDays, format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStatusLabel, getStatusConfig } from './OrderStatusBadge';
import type { OrderStatusHistoryWithUser, ApprovalHistory } from '@/types/types';

interface OrderProgressTimelineProps {
  entryDate: string;
  estimatedCompletion?: string | null;
  completedAt?: string | null;
  status: string;
  history?: OrderStatusHistoryWithUser[];
  approvalHistory?: ApprovalHistory[];
}

interface TimelineItem {
  id: string;
  type: 'status' | 'approval' | 'entry' | 'completion';
  date: Date;
  title: string;
  description?: string;
  icon: any;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  data?: any;
}

export function OrderProgressTimeline({ 
  entryDate, 
  estimatedCompletion, 
  completedAt, 
  status,
  history = [],
  approvalHistory = []
}: OrderProgressTimelineProps) {
  const entry = new Date(entryDate);
  const today = new Date();
  const estimated = estimatedCompletion ? new Date(estimatedCompletion) : null;
  const completed = completedAt ? new Date(completedAt) : null;

  // Calcular dias desde a entrada
  const daysSinceEntry = differenceInDays(today, entry);
  
  // Calcular dias até a conclusão estimada
  const daysUntilEstimated = estimated ? differenceInDays(estimated, today) : null;
  
  // Calcular progresso baseado no status (0-100%)
  const getStatusProgress = (status: string): number => {
    const statusProgress: Record<string, number> = {
      'recebido': 15,
      'received': 15,
      'em_analise': 25,
      'analyzing': 25,
      'aguardando_aprovacao': 40,
      'awaiting_approval': 40,
      'aprovado': 50,
      'approved': 50,
      'em_reparo': 65,
      'in_repair': 65,
      'aguardando_pecas': 55,
      'awaiting_parts': 55,
      'finalizado': 90,
      'completed': 90,
      'pronto_para_retirada': 100,
      'ready_for_pickup': 100,
      'entregue': 100,
    };
    return statusProgress[status] || 0;
  };

  const statusProgress = getStatusProgress(status);
  
  // Calcular progresso (0-100%)
  let progress = statusProgress;
  
  // Se já foi concluído, sempre 100%
  if (completed) {
    progress = 100;
  }

  // Determinar se está atrasado
  const isDelayed = estimated && !completed && isAfter(today, estimated);

  // Criar timeline unificada com todos os eventos
  const timelineItems: TimelineItem[] = [];

  // Adicionar entrada do equipamento
  timelineItems.push({
    id: 'entry',
    type: 'entry',
    date: entry,
    title: 'Entrada do Equipamento',
    description: `Há ${daysSinceEntry} ${daysSinceEntry === 1 ? 'dia' : 'dias'}`,
    icon: Calendar,
    iconColor: 'text-primary',
    bgColor: 'bg-primary/20',
    borderColor: 'border-primary',
  });

  // Adicionar histórico de status
  history.forEach((item) => {
    const config = getStatusConfig(item.status);
    timelineItems.push({
      id: item.id,
      type: 'status',
      date: new Date(item.created_at),
      title: getStatusLabel(item.status),
      description: item.notes || undefined,
      icon: CheckCircle2,
      iconColor: config.color,
      bgColor: config.bgColor,
      borderColor: config.borderColor,
      data: item,
    });
  });

  // Adicionar aprovações
  approvalHistory.forEach((item) => {
    timelineItems.push({
      id: item.id,
      type: 'approval',
      date: new Date(item.approved_at),
      title: '💰 Orçamento Aprovado',
      description: `Total: R$ ${item.total_cost?.toFixed(2).replace('.', ',')}`,
      icon: DollarSign,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500',
      data: item,
    });
  });

  // Ordenar por data
  timelineItems.sort((a, b) => a.date.getTime() - b.date.getTime());

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Linha do Tempo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Barra de Progresso baseada no Status */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso do Atendimento</span>
            <span className="font-semibold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isDelayed ? 'bg-destructive' : 'bg-primary'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Status atual: <span className="font-medium text-foreground">{getStatusLabel(status as any)}</span>
          </p>
        </div>

        {/* Timeline Items - Todos os eventos */}
        <div className="space-y-4">
          {timelineItems.map((item, index) => {
            const isLast = index === timelineItems.length - 1;
            const Icon = item.icon;
            
            return (
              <div key={item.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${item.bgColor} ${item.borderColor}`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 h-full min-h-[40px] bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-semibold text-foreground">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  )}
                  {item.type === 'approval' && item.data && (
                    <div className="mt-2 space-y-1 text-xs bg-muted/50 p-2 rounded">
                      <p className="text-muted-foreground">
                        <span className="font-medium">Mão de obra:</span> {formatCurrency(item.data.labor_cost)}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Peças:</span> {formatCurrency(item.data.parts_cost)}
                      </p>
                      <p className="text-muted-foreground font-semibold">
                        <span className="font-bold">Total:</span> {formatCurrency(item.data.total_cost)}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    📅 {format(item.date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumo */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{daysSinceEntry}</p>
              <p className="text-xs text-muted-foreground">
                {daysSinceEntry === 1 ? 'Dia' : 'Dias'} em Atendimento
              </p>
            </div>
            {estimated && !completed && daysUntilEstimated !== null && (
              <div>
                <p className={`text-2xl font-bold ${isDelayed ? 'text-destructive' : 'text-primary'}`}>
                  {Math.abs(daysUntilEstimated)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isDelayed ? 'Dias de Atraso' : daysUntilEstimated === 0 ? 'Previsto para Hoje' : 'Dias de Atendimento'}
                </p>
              </div>
            )}
            {completed && (
              <div>
                <p className="text-2xl font-bold text-green-500">0</p>
                <p className="text-xs text-muted-foreground">Dias de Atendimento</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
