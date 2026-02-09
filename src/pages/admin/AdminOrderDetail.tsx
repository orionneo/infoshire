import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Check, Edit, ExternalLink, Loader2, Trash2, Tag, Brain } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatBox } from '@/components/ChatBox';
import { DiagnosticAssistant } from '@/components/DiagnosticAssistant';
import { SolutionLearning } from '@/components/SolutionLearning';
import { IntelligentFlow } from '@/components/IntelligentFlow';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { OrderProgressTimeline } from '@/components/OrderProgressTimeline';
import { allStatuses, OrderStatusBadge } from '@/components/OrderStatusBadge';
import { OrderTimeline } from '@/components/OrderTimeline';
import { OrderImageGallery } from '@/components/orders/OrderImageGallery';
import WarrantyStatus from '@/components/WarrantyStatus';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { SmartTextarea } from '@/components/ui/SmartTextarea';
import { VoiceInput } from '@/components/ui/voice-input';
import { useAuth } from '@/contexts/AuthContext';
import { createMessage, deleteServiceOrder, getOrderStatusHistory, getServiceOrder, getServiceOrderItems, getSystemSetting, updateServiceOrder, updateServiceOrderStatus, updateServiceOrderDiscount } from '@/db/api';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ApprovalHistory, OrderStatus, OrderStatusHistoryWithUser, ServiceOrderItem, ServiceOrderWithClient } from '@/types/types';

const formatWhatsAppPhone = (phone: string) => {
  let phoneNumber = phone.replace(/\D/g, '');

  if (phoneNumber.length === 11 && !phoneNumber.startsWith('55')) {
    phoneNumber = `55${phoneNumber}`;
  } else if (phoneNumber.length === 10 && !phoneNumber.startsWith('55')) {
    phoneNumber = `55${phoneNumber}`;
  }

  return phoneNumber;
};

const buildWhatsAppUrl = (phone: string | null | undefined, message: string) => {
  if (!phone) return '';

  const phoneNumber = formatWhatsAppPhone(phone);

  return phoneNumber ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}` : '';
};

const getSubtotal = (laborCost: number | null | undefined, partsCost: number | null | undefined) =>
  (laborCost || 0) + (partsCost || 0);

const getTotalFinal = (subtotal: number, discountAmount: number | null | undefined) =>
  Math.max(subtotal - (discountAmount || 0), 0);

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<ServiceOrderWithClient | null>(null);
  const [history, setHistory] = useState<OrderStatusHistoryWithUser[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [additionalItems, setAdditionalItems] = useState<ServiceOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [whatsappSettings, setWhatsappSettings] = useState({
    budgetRequestTemplate: '',
    readyForPickupTemplate: '',
    notApprovedTemplate: '',
    businessAddress: '',
    businessHours: '',
  });

  const editForm = useForm({
    defaultValues: {
      equipment: '',
      serial_number: '',
      problem_description: '',
      entry_date: '',
      estimated_completion: '',
    },
  });

  const statusForm = useForm({
    defaultValues: {
      status: '' as OrderStatus,
      notes: '',
      labor_cost: '',
      parts_cost: '',
      budget_notes: '',
    },
  });

  const discountForm = useForm({
    defaultValues: {
      discount_amount: '',
      discount_reason: '',
    },
  });

  const selectedStatus = statusForm.watch('status');

  useEffect(() => {
    if (id) {
      loadOrder();
      loadHistory();
      loadApprovalHistory();
      loadAdditionalItems();
    }
  }, [id]);

  useEffect(() => {
    const loadWhatsAppSettings = async () => {
      try {
        const [
          budgetRequestTemplate,
          readyForPickupTemplate,
          notApprovedTemplate,
          businessAddress,
          businessHours,
        ] = await Promise.all([
          getSystemSetting('whatsapp_template_budget_request'),
          getSystemSetting('whatsapp_template_ready_for_pickup'),
          getSystemSetting('whatsapp_template_not_approved'),
          getSystemSetting('business_address'),
          getSystemSetting('business_hours'),
        ]);

        setWhatsappSettings({
          budgetRequestTemplate: budgetRequestTemplate || '',
          readyForPickupTemplate: readyForPickupTemplate || '',
          notApprovedTemplate: notApprovedTemplate || '',
          businessAddress: businessAddress || '',
          businessHours: businessHours || '',
        });
      } catch (error) {
        console.error('Erro ao carregar configurações do WhatsApp:', error);
      }
    };

    loadWhatsAppSettings();
  }, []);

  useEffect(() => {
    if (order) {
      editForm.reset({
        equipment: order.equipment,
        serial_number: order.serial_number || '',
        problem_description: order.problem_description,
        entry_date: order.entry_date
          ? format(new Date(order.entry_date), 'yyyy-MM-dd')
          : '',
        estimated_completion: order.estimated_completion
          ? format(new Date(order.estimated_completion), 'yyyy-MM-dd')
          : '',
      });
      
      discountForm.reset({
        discount_amount: order.discount_amount ? order.discount_amount.toString() : '',
        discount_reason: order.discount_reason || '',
      });
    }
  }, [order]);

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

  const deleteApproval = async (approvalId: string) => {
    try {
      const { error } = await supabase
        .from('approval_history')
        .delete()
        .eq('id', approvalId);

      if (error) throw error;

      toast({
        title: 'Aprovação excluída',
        description: 'O registro de aprovação foi removido com sucesso.',
      });

      // Reload approval history to update the list and consolidated total
      loadApprovalHistory();
    } catch (error) {
      console.error('Erro ao excluir aprovação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a aprovação. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const onEditSubmit = async (data: any) => {
    if (!order || !id) return;

    setUpdating(true);
    try {
      // Converter datas para ISO timestamp
      // CRÍTICO PARA BRASIL (GMT-3): Salvar como meio-dia UTC para evitar shift de data
      // Quando converter para local (GMT-3), ainda será o mesmo dia
      let entryDateISO: string | null = null;
      let estimatedCompletionISO: string | null = null;

      if (data.entry_date) {
        // Input: "2026-01-10" -> Salvar como "2026-01-10T12:00:00.000Z" (meio-dia UTC)
        // Ao converter para GMT-3: 2026-01-10T09:00:00 (ainda dia 10)
        entryDateISO = data.entry_date + 'T12:00:00.000Z';
      }

      if (data.estimated_completion) {
        // Input: "2026-01-10" -> Salvar como "2026-01-10T12:00:00.000Z" (meio-dia UTC)
        // Ao converter para GMT-3: 2026-01-10T09:00:00 (ainda dia 10)
        estimatedCompletionISO = data.estimated_completion + 'T12:00:00.000Z';
      }

      await updateServiceOrder(id, {
        equipment: data.equipment,
        serial_number: data.serial_number || null,
        problem_description: data.problem_description,
        entry_date: entryDateISO,
        estimated_completion: estimatedCompletionISO,
      });

      toast({
        title: 'Ordem atualizada',
        description: 'As informações foram atualizadas com sucesso',
      });

      setEditDialogOpen(false);
      loadOrder();
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a ordem',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const onStatusSubmit = async (data: any) => {
    if (!order || !id || !user) return;

    setUpdating(true);
    const isAwaitingApproval = data.status === 'awaiting_approval';
    const isReadyForPickup = data.status === 'ready_for_pickup';
    const isNotApproved = data.status === 'not_approved';
    const laborCost = isAwaitingApproval ? parseFloat(data.labor_cost) || 0 : 0;
    const partsCost = isAwaitingApproval ? parseFloat(data.parts_cost) || 0 : 0;
    const subtotal = laborCost + partsCost;
    const discountAmount = order.discount_amount || 0;
    const totalFinal = getTotalFinal(subtotal, discountAmount);
    const newApprovalToken = isAwaitingApproval ? crypto.randomUUID() : '';
    const approvalUrl = newApprovalToken ? `${window.location.origin}/approve/${newApprovalToken}` : '';
    const { budgetRequestTemplate, readyForPickupTemplate, notApprovedTemplate, businessAddress, businessHours } = whatsappSettings;
    let whatsappUrl = '';

    if (order.client.phone) {
      if (isAwaitingApproval && budgetRequestTemplate) {
        const formattedLaborCost = laborCost.toFixed(2).replace('.', ',');
        const formattedPartsCost = partsCost.toFixed(2).replace('.', ',');
        const formattedSubtotal = subtotal.toFixed(2).replace('.', ',');
        const formattedDiscount = discountAmount.toFixed(2).replace('.', ',');
        const formattedTotalFinal = totalFinal.toFixed(2).replace('.', ',');
        const formattedObservations = data.budget_notes
          ? `📝 *Observações:*\n${data.budget_notes}\n\n`
          : '';
        const whatsappMessage = budgetRequestTemplate
          .replace(/{nome_cliente}/g, order.client.name || 'Cliente')
          .replace(/{cliente_nome}/g, order.client.name || 'Cliente')
          .replace(/{numero_os}/g, order.order_number)
          .replace(/{equipamento}/g, order.equipment)
          .replace(/{valor_mao_obra}/g, formattedLaborCost)
          .replace(/{valor_pecas}/g, formattedPartsCost)
          .replace(/{valor_total}/g, formattedSubtotal)
          .replace(/{desconto}/g, discountAmount > 0 ? `🎁 *Desconto aplicado:* R$ ${formattedDiscount}\n` : '')
          .replace(/{valor_final}/g, discountAmount > 0 ? `✨ *Valor final:* R$ ${formattedTotalFinal}\n\n` : '')
          .replace(/{observacoes}/g, formattedObservations)
          .replace(/{link_aprovacao}/g, approvalUrl);

        whatsappUrl = buildWhatsAppUrl(order.client.phone, whatsappMessage);
      }

      if (isReadyForPickup && readyForPickupTemplate) {
        const whatsappMessage = readyForPickupTemplate
          .replace(/{nome_cliente}/g, order.client.name || 'Cliente')
          .replace(/{cliente_nome}/g, order.client.name || 'Cliente')
          .replace(/{numero_os}/g, order.order_number)
          .replace(/{equipamento}/g, order.equipment)
          .replace(/{endereco}/g, businessAddress)
          .replace(/{address}/g, businessAddress)
          .replace(/{horario}/g, businessHours)
          .replace(/{business_hours}/g, businessHours)
          .replace(/{valor_total}/g, order.total_cost ? `💰 *Valor total:* R$ ${order.total_cost.toFixed(2).replace('.', ',')}\n` : '')
          .replace(/{desconto}/g, order.discount_amount && order.discount_amount > 0 ? `🎁 *Desconto aplicado:* R$ ${order.discount_amount.toFixed(2).replace('.', ',')}\n` : '')
          .replace(/{valor_final}/g, order.discount_amount && order.discount_amount > 0 && order.total_cost ? `✨ *Valor final:* R$ ${order.total_cost.toFixed(2).replace('.', ',')}\n\n` : '')
          .replace(/{observacoes}/g, data.notes ? `📝 *Observações:*\n${data.notes}\n\n` : '');

        whatsappUrl = buildWhatsAppUrl(order.client.phone, whatsappMessage);
      }

      if (isNotApproved && notApprovedTemplate) {
        const whatsappMessage = notApprovedTemplate
          .replace(/{nome_cliente}/g, order.client.name || 'Cliente')
          .replace(/{cliente_nome}/g, order.client.name || 'Cliente')
          .replace(/{numero_os}/g, order.order_number)
          .replace(/{equipamento}/g, order.equipment)
          .replace(/{endereco}/g, businessAddress)
          .replace(/{address}/g, businessAddress)
          .replace(/{horario}/g, businessHours)
          .replace(/{business_hours}/g, businessHours)
          .replace(/{observacoes}/g, data.notes ? `📝 Observações: ${data.notes}\n\n` : '');

        whatsappUrl = buildWhatsAppUrl(order.client.phone, whatsappMessage);
      }
    }

    try {
      if ((isAwaitingApproval || isReadyForPickup || isNotApproved) && whatsappUrl) {
        const openedWindow = window.open(whatsappUrl, '_blank');
        if (!openedWindow) {
          window.location.href = whatsappUrl;
        }
      }

      // If status is awaiting_approval, update budget fields and generate NEW approval token
      if (isAwaitingApproval) {
        await updateServiceOrder(id, {
          status: data.status,
          labor_cost: laborCost,
          parts_cost: partsCost,
          total_cost: totalFinal,
          budget_notes: data.budget_notes || null,
          approval_token: newApprovalToken,
          budget_approved: false, // Reset approval status for new budget
          approved_at: null, // Clear previous approval date
        });
        
        // Create message in chat with budget details and approval link
        const budgetMessage = `🔔 *ORÇAMENTO DISPONÍVEL*

Olá ${order.client.name || 'Cliente'}!

Seu orçamento para o reparo do equipamento *${order.equipment}* está pronto:

💰 *Detalhamento do Orçamento:*
${laborCost > 0 ? `• Mão de Obra: R$ ${laborCost.toFixed(2).replace('.', ',')}` : ''}
${partsCost > 0 ? `• Peças: R$ ${partsCost.toFixed(2).replace('.', ',')}` : ''}
• *Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}*
${discountAmount > 0 ? `• Desconto: R$ ${discountAmount.toFixed(2).replace('.', ',')}` : ''}
• *Total final: R$ ${totalFinal.toFixed(2).replace('.', ',')}*

${data.budget_notes ? `📝 *Observações:*\n${data.budget_notes}\n\n` : ''}✅ *Para aprovar o orçamento, clique no link abaixo:*
${approvalUrl}

🔐 *Dados de Acesso ao Sistema:*
• Login: ${order.client.email}
• Senha: 123456
• Acesse: ${window.location.origin}/login

Após a aprovação, daremos continuidade ao reparo imediatamente! 🔧`;

        // Send message to chat
        await createMessage({
          order_id: id,
          sender_id: user.id,
          content: budgetMessage,
        });
        
        // Generate WhatsApp message only if phone exists
        if (order.client.phone) {
          // Warn if template not configured but continue
          if (!budgetRequestTemplate) {
            toast({
              title: 'Aviso',
              description: 'Template de orçamento não configurado. Configure em Admin > Configurações > WhatsApp para enviar mensagens automáticas.',
              variant: 'default',
            });
            console.warn('Template de orçamento não configurado');
          }
        }
      } else if (isReadyForPickup) {
        // Update status first
        await updateServiceOrderStatus(id, data.status, data.notes || null, user.id);
        
        // Warn if template not configured but continue with status update
        if (!readyForPickupTemplate) {
          toast({
            title: 'Aviso',
            description: 'Template de WhatsApp não configurado. Configure em Admin > Configurações > WhatsApp para enviar mensagens automáticas.',
            variant: 'default',
          });
          console.warn('Template de WhatsApp não configurado');
        } else {
          // Create message in chat notifying client that equipment is ready (support both variable formats)
          const pickupMessage = readyForPickupTemplate
            .replace(/{nome_cliente}/g, order.client.name || 'Cliente')
            .replace(/{cliente_nome}/g, order.client.name || 'Cliente')
            .replace(/{numero_os}/g, order.order_number)
            .replace(/{equipamento}/g, order.equipment)
            .replace(/{endereco}/g, businessAddress)
            .replace(/{address}/g, businessAddress)
            .replace(/{horario}/g, businessHours)
            .replace(/{business_hours}/g, businessHours)
            .replace(/{valor_total}/g, order.total_cost ? `💰 *Valor total:* R$ ${order.total_cost.toFixed(2).replace('.', ',')}\n` : '')
            .replace(/{desconto}/g, order.discount_amount && order.discount_amount > 0 ? `🎁 *Desconto aplicado:* R$ ${order.discount_amount.toFixed(2).replace('.', ',')}\n` : '')
            .replace(/{valor_final}/g, order.discount_amount && order.discount_amount > 0 && order.total_cost ? `✨ *Valor final:* R$ ${order.total_cost.toFixed(2).replace('.', ',')}\n\n` : '')
            .replace(/{observacoes}/g, data.notes ? `📝 *Observações:*\n${data.notes}\n\n` : '');

          await createMessage({
            order_id: id,
            sender_id: user.id,
            content: pickupMessage,
          });
        }
      } else if (isNotApproved) {
        // Update status first
        await updateServiceOrderStatus(id, data.status, data.notes || null, user.id);
        
        // Warn if template not configured but continue with status update
        if (!notApprovedTemplate) {
          toast({
            title: 'Aviso',
            description: 'Template de orçamento não aprovado não configurado. Configure em Admin > Configurações > WhatsApp para enviar mensagens automáticas.',
            variant: 'default',
          });
          console.warn('Template de orçamento não aprovado não configurado');
        } else {
          // Create message in chat notifying client that budget was not approved (support both variable formats)
          const notApprovedMessage = notApprovedTemplate
            .replace(/{nome_cliente}/g, order.client.name || 'Cliente')
            .replace(/{cliente_nome}/g, order.client.name || 'Cliente')
            .replace(/{numero_os}/g, order.order_number)
            .replace(/{equipamento}/g, order.equipment)
            .replace(/{endereco}/g, businessAddress)
            .replace(/{address}/g, businessAddress)
            .replace(/{horario}/g, businessHours)
            .replace(/{business_hours}/g, businessHours)
            .replace(/{observacoes}/g, data.notes ? `📝 *Observações:*\n${data.notes}\n\n` : '');

          await createMessage({
            order_id: id,
            sender_id: user.id,
            content: notApprovedMessage,
          });
        }

        // Send Telegram notification for not approved budget
        try {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              orderNumber: order.order_number,
              equipment: order.equipment,
              clientName: order.client.name || order.client.email || 'Cliente',
              notificationType: 'not_approved',
            },
          });
        } catch (telegramError) {
          console.error('Erro ao enviar notificação do Telegram:', telegramError);
          // Don't fail the whole operation if Telegram fails
        }
      } else {
        // Update status for all other cases
        await updateServiceOrderStatus(id, data.status, data.notes || null, user.id);
        
        // If status is completed or delivered, send WhatsApp notification
        if (data.status === 'completed' || data.status === 'delivered') {
          try {
            // Import the function dynamically to avoid circular dependencies
            const { sendOrderCompletedWhatsApp } = await import('@/db/api');
            await sendOrderCompletedWhatsApp(id);
          } catch (whatsappError) {
            console.error('Erro ao enviar WhatsApp de conclusão:', whatsappError);
            // Don't fail the whole operation if WhatsApp fails
          }
        }
      }

      // Show success toast
      toast({
        title: 'Status atualizado',
        description: data.status === 'awaiting_approval' 
          ? order.client.phone 
            ? 'Orçamento enviado! Redirecionando para WhatsApp...'
            : 'Orçamento salvo no chat! Cliente sem telefone cadastrado.'
          : data.status === 'ready_for_pickup'
            ? order.client.phone
              ? 'Equipamento marcado como pronto! Redirecionando para WhatsApp...'
              : 'Equipamento marcado como pronto! Mensagem salva no chat.'
            : data.status === 'not_approved'
              ? order.client.phone
                ? 'Status atualizado! Redirecionando para WhatsApp...'
                : 'Status atualizado! Mensagem salva no chat.'
              : (data.status === 'completed' || data.status === 'delivered')
                ? order.client.phone
                  ? 'OS finalizada! Abrindo WhatsApp para enviar notificação de garantia...'
                  : 'OS finalizada! Cliente sem telefone cadastrado.'
                : 'O status da ordem foi atualizado com sucesso',
      });

      setStatusDialogOpen(false);
      statusForm.reset();
      loadOrder();
      loadHistory();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);
    try {
      await deleteServiceOrder(id);

      toast({
        title: 'Ordem excluída',
        description: 'A ordem foi excluída com sucesso',
      });

      navigate('/admin/orders');
    } catch (error) {
      console.error('Erro ao excluir ordem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a ordem',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDiscountSubmit = async (data: { discount_amount: string; discount_reason: string }) => {
    if (!id) return;

    setUpdating(true);
    try {
      const discountAmount = parseFloat(data.discount_amount) || 0;
      
      if (discountAmount < 0) {
        toast({
          title: 'Erro',
          description: 'O valor do desconto não pode ser negativo',
          variant: 'destructive',
        });
        return;
      }

      await updateServiceOrderDiscount(id, discountAmount, data.discount_reason.trim());

      toast({
        title: 'Desconto atualizado',
        description: 'O desconto foi aplicado com sucesso',
      });

      setDiscountDialogOpen(false);
      loadOrder();
    } catch (error) {
      console.error('Erro ao aplicar desconto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aplicar o desconto',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
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

  if (!order) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium mb-2">Ordem não encontrada</p>
            <Button onClick={() => navigate('/admin/orders')}>Voltar</Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const subtotal = getSubtotal(order.labor_cost, order.parts_cost);
  const discountAmount = order.discount_amount || 0;
  const totalFinal = getTotalFinal(subtotal, discountAmount);

  return (
    <AdminLayout>
      <div className="space-y-4 pb-6">
        {/* Header - Mobile Optimized */}
        <div className="flex items-start gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/admin/orders')}
            className="shrink-0 h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold truncate">
              OS #{order.order_number}
            </h1>
            <p className="text-sm text-muted-foreground truncate">{order.equipment}</p>
          </div>
        </div>

        {/* Action Buttons - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-11 text-base">
                Atualizar Status
              </Button>
            </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Atualizar Status</DialogTitle>
                </DialogHeader>
                <Form {...statusForm}>
                  <form onSubmit={statusForm.handleSubmit(onStatusSubmit)} className="space-y-4">
                    <FormField
                      control={statusForm.control}
                      name="status"
                      rules={{ required: 'Status é obrigatório' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Novo Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 text-base">
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allStatuses.map((status) => (
                                <SelectItem key={status.value} value={status.value} className="text-base py-3">
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Budget Fields - Show only when status is awaiting_approval */}
                    {selectedStatus === 'awaiting_approval' && (
                      <div className="space-y-4 p-4 bg-primary/5 rounded-lg border-2 border-primary">
                        <h3 className="font-semibold text-lg">Detalhamento do Orçamento</h3>
                        
                        <FormField
                          control={statusForm.control}
                          name="labor_cost"
                          rules={{ 
                            required: 'Mão de obra é obrigatória',
                            pattern: {
                              value: /^\d+(\.\d{1,2})?$/,
                              message: 'Digite um valor válido (ex: 150.00)'
                            }
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mão de Obra (R$) *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="h-11 text-base"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={statusForm.control}
                          name="parts_cost"
                          rules={{ 
                            required: 'Valor das peças é obrigatório',
                            pattern: {
                              value: /^\d+(\.\d{1,2})?$/,
                              message: 'Digite um valor válido (ex: 250.00)'
                            }
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Peças (R$) *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="h-11 text-base"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="p-3 bg-background rounded border">
                          <div className="flex justify-between items-center">
                            <span className="font-bold">Total:</span>
                            <span className="font-bold text-xl text-primary">
                              R$ {(
                                (parseFloat(statusForm.watch('labor_cost')) || 0) + 
                                (parseFloat(statusForm.watch('parts_cost')) || 0)
                              ).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                        
                        <FormField
                          control={statusForm.control}
                          name="budget_notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observações do Orçamento (opcional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Ex: Inclui limpeza completa, troca de pasta térmica..."
                                  className="min-h-[100px] text-base"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    
                    <FormField
                      control={statusForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações {selectedStatus === 'awaiting_approval' ? 'Internas' : ''} (opcional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Textarea
                                placeholder="Adicione observações sobre esta atualização"
                                className="min-h-[120px] text-base pr-12"
                                {...field}
                              />
                              <div className="absolute right-2 top-2">
                                <VoiceInput 
                                  onTranscript={(text) => field.onChange(text)}
                                  appendMode={true}
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col sm:flex-row gap-2 justify-end">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setStatusDialogOpen(false)}
                        className="h-11 text-base"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={updating} className="h-11 text-base">
                        {updating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Atualizando...
                          </>
                        ) : (
                          'Atualizar'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button 
              variant={showDiagnostic ? "default" : "outline"}
              className="w-full sm:w-auto h-11 text-base"
              onClick={() => setShowDiagnostic(!showDiagnostic)}
            >
              <Brain className="h-4 w-4 mr-2" />
              {showDiagnostic ? 'Ocultar' : 'Diagnóstico IA'}
            </Button>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto h-11 text-base">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Ordem de Serviço</DialogTitle>
                </DialogHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="equipment"
                      rules={{ required: 'Equipamento é obrigatório' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipamento</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Série (S/N)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Opcional" className="h-11 text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="problem_description"
                      rules={{ required: 'Descrição é obrigatória' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do Problema</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[120px] text-base" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="entry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Entrada</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-11 text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="estimated_completion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previsão de Conclusão</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-11 text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col sm:flex-row gap-2 justify-end">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setEditDialogOpen(false)}
                        className="h-11 text-base"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={updating} className="h-11 text-base">
                        {updating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto h-11 text-base">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

        {/* Main Content - Mobile First Grid */}
        <div className={cn(
          "grid grid-cols-1 gap-4",
          showDiagnostic ? "xl:grid-cols-4" : "xl:grid-cols-3"
        )}>
          {/* Diagnostic Assistant - Show when enabled */}
          {showDiagnostic && (
            <div className="xl:col-span-1 xl:order-last">
              <div className="xl:sticky xl:top-4">
                <DiagnosticAssistant
                  problemDescription={order.problem_description}
                  equipment={order.equipment}
                  orderId={order.id}
                  status={order.status}
                  onClose={() => setShowDiagnostic(false)}
                />
              </div>
            </div>
          )}

          <Card className="xl:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                <p className="font-medium text-base">{order.client.name || order.client.email}</p>
                {order.client.phone && (
                  <p className="text-sm text-muted-foreground">{order.client.phone}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Equipamento</p>
                <p className="font-medium text-base">{order.equipment}</p>
              </div>
              {order.serial_number && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Número de Série (S/N)</p>
                  <p className="font-medium font-mono text-sm break-all">{order.serial_number}</p>
                </div>
              )}
              {order.has_multiple_items && additionalItems.length > 0 && (
                <div className="col-span-full">
                  <p className="text-xs text-muted-foreground mb-2">Equipamentos Adicionais</p>
                  <div className="space-y-2">
                    {additionalItems.map((item, index) => (
                      <div key={item.id} className="p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm">Item {index + 1}: {item.equipment}</p>
                        </div>
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
                  <p className="text-xs text-muted-foreground mb-1">Data de Entrada</p>
                  <p className="font-medium text-base">
                    {format(new Date(order.entry_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
              {order.equipment_photo_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Foto do Equipamento</p>
                  <img
                    src={order.equipment_photo_url}
                    alt="Foto do equipamento"
                    className="w-full rounded-lg border-2 border-border object-cover max-h-48"
                  />
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Problema</p>
                <p className="font-medium text-base">{order.problem_description}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <div className="mt-1">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Criado em</p>
                <p className="font-medium text-base">
                  {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              {order.estimated_completion && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Previsão de Conclusão</p>
                  <p className="font-medium text-base">
                    {format(new Date(order.estimated_completion), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
              {order.completed_at && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Concluído em</p>
                  <p className="font-medium text-base">
                    {format(new Date(order.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
              
              {/* Approval History */}
              {approvalHistory.length > 0 && (
                <div className="pt-3 border-t space-y-3">
                  <h3 className="font-semibold text-base">Histórico de Aprovações</h3>
                  <div className="space-y-2">
                    {approvalHistory.map((approval, index) => {
                      const approvalSubtotal = approval.subtotal_cost ?? getSubtotal(approval.labor_cost, approval.parts_cost);
                      const approvalDiscount = approval.discount_amount || 0;
                      const approvalTotalFinal = approval.total_final_cost ?? approval.total_cost ?? getTotalFinal(approvalSubtotal, approvalDiscount);

                      return (
                      <div key={approval.id} className="p-2 bg-muted rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Aprovação #{approvalHistory.length - index}</span>
                            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir aprovação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O registro de aprovação será removido permanentemente e o valor será descontado do total consolidado.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteApproval(approval.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <div className="space-y-0.5 text-xs">
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
                          {approvalSubtotal > 0 && (
                            <div className="flex justify-between pt-0.5 border-t border-border">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span>R$ {approvalSubtotal.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                          {approvalDiscount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Desconto</span>
                              <span>- R$ {approvalDiscount.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                          {approvalTotalFinal > 0 && (
                            <div className="flex justify-between font-semibold pt-0.5 border-t border-border">
                              <span>Total final</span>
                              <span className="text-primary">
                                R$ {approvalTotalFinal.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {format(new Date(approval.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  
                  {/* Total Consolidado */}
                  {approvalHistory.length > 0 && (
                    <div className="p-3 bg-primary/10 rounded-lg border-2 border-primary">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">Total Consolidado</span>
                        <span className="font-bold text-lg text-primary">
                          R$ {approvalHistory.reduce((sum, a) => sum + (a.total_final_cost ?? a.total_cost ?? 0), 0).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Soma de {approvalHistory.length} aprovação{approvalHistory.length > 1 ? 'ões' : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Resumo Financeiro */}
              <div className="pt-3 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">Resumo Financeiro</h3>
                  <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Tag className="h-3 w-3 mr-1" />
                        {discountAmount > 0 ? 'Editar' : 'Aplicar'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Aplicar Desconto</DialogTitle>
                      </DialogHeader>
                      <Form {...discountForm}>
                        <form onSubmit={discountForm.handleSubmit(handleDiscountSubmit)} className="space-y-4">
                          <FormField
                            control={discountForm.control}
                            name="discount_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor do Desconto (R$)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0,00"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={discountForm.control}
                            name="discount_reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Motivo do Desconto (opcional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Descreva o motivo do desconto..."
                                    className="min-h-[100px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setDiscountDialogOpen(false)}
                              disabled={updating}
                            >
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={updating}>
                              {updating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                'Aplicar Desconto'
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className={discountAmount > 0 ? 'text-orange-600' : ''}>
                      {discountAmount > 0 ? `- R$ ${discountAmount.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-semibold pt-1 border-t border-border">
                    <span>Total final</span>
                    <span className="text-green-600 dark:text-green-400">
                      R$ {totalFinal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {order.discount_reason && (
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium">Motivo:</span> {order.discount_reason}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Componente de Status de Garantia */}
          <WarrantyStatus order={order} onUpdate={loadOrder} isAdmin={true} />

          <div className={cn(showDiagnostic ? "xl:col-span-3" : "xl:col-span-2")}>
            <Tabs defaultValue="timeline">
              <TabsList className="grid w-full grid-cols-5 h-auto xl:h-11 gap-1 p-1">
                <TabsTrigger value="timeline" className="text-xs xl:text-sm px-2 py-2">
                  <span className="hidden xl:inline">Histórico</span>
                  <span className="xl:hidden">📋</span>
                </TabsTrigger>
                <TabsTrigger value="photos" className="text-xs xl:text-sm px-2 py-2">
                  <span className="hidden xl:inline">Fotos</span>
                  <span className="xl:hidden">📷</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-xs xl:text-sm px-2 py-2">
                  <span className="hidden xl:inline">Mensagens</span>
                  <span className="xl:hidden">💬</span>
                </TabsTrigger>
                <TabsTrigger value="ai-suggestions" className="text-xs xl:text-sm px-2 py-2">
                  <span className="hidden xl:inline">Sugestões IA</span>
                  <span className="xl:hidden">🤖</span>
                </TabsTrigger>
                <TabsTrigger value="learning" className="text-xs xl:text-sm px-2 py-2">
                  <span className="hidden xl:inline">Aprendizado</span>
                  <span className="xl:hidden">📚</span>
                </TabsTrigger>
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
                <OrderImageGallery orderId={order.id} isAdmin={true} />
              </TabsContent>
              <TabsContent value="chat">
                <Card>
                  <CardHeader>
                    <CardTitle>Mensagens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChatBox orderId={order.id} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="ai-suggestions">
                <IntelligentFlow
                  equipment={order.equipment}
                  problemDescription={order.problem_description}
                  status={order.status}
                  hasConclusion={!!order.completed_at}
                  hasParts={!!order.parts_cost && order.parts_cost > 0}
                  hasValue={!!order.total_cost && order.total_cost > 0}
                  onApplyDeadline={(days) => {
                    const newDate = new Date();
                    newDate.setDate(newDate.getDate() + days);
                    editForm.setValue('estimated_completion', format(newDate, 'yyyy-MM-dd'));
                    toast({
                      title: 'Prazo aplicado',
                      description: `Prazo de ${days} dias foi aplicado. Salve as alterações.`,
                    });
                  }}
                />
              </TabsContent>
              <TabsContent value="learning">
                <SolutionLearning
                  orderId={order.id}
                  equipment={order.equipment}
                  problemDescription={order.problem_description}
                  onSaved={() => {
                    toast({
                      title: 'Sucesso',
                      description: 'Solução registrada com sucesso!',
                    });
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
