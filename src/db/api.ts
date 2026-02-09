import type {
  EmailCampaignWithSender,
  EmailConfig,
  Message,
  MessageWithSender,
  OrderImage,
  OrderImageWithUploader,
  OrderStatus,
  OrderStatusHistory,
  OrderStatusHistoryWithUser,
  PopupConfig,
  Profile,
  PublicOrderInfo,
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderWithClient,
  SiteSetting,
} from '@/types/types';
import { supabase } from './supabase';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Helper para tratamento de erros de API
 */
function handleApiError(error: any, context: string): never {
  console.error(`❌ Erro na API [${context}]:`, error);
  
  // Erros de rede/conexão
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
  }
  
  // Erros de timeout
  if (error.message?.includes('timeout')) {
    throw new Error('A requisição demorou muito. Tente novamente.');
  }
  
  // Erros de SSL/certificado
  if (error.message?.includes('SSL') || error.message?.includes('certificate')) {
    throw new Error('Erro de segurança na conexão. Verifique se está usando HTTPS.');
  }
  
  // Erro genérico
  throw new Error(error.message || 'Erro ao processar requisição');
}

// Profiles
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfileRole(id: string, role: 'client' | 'admin'): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createClientProfile(clientData: {
  email: string;
  name: string;
  phone: string;
  password: string;
}): Promise<Profile> {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: clientData.email,
    password: clientData.password,
    options: {
      data: {
        name: clientData.name,
        phone: clientData.phone,
      },
    },
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Falha ao criar usuário');

  // Get the created profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error('Perfil não encontrado');

  return profile;
}


// Service Orders
export async function getAllServiceOrders(): Promise<ServiceOrderWithClient[]> {
  const { data, error } = await supabase
    .from('service_orders')
    .select('*, client:profiles!client_id(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getClientServiceOrders(clientId: string): Promise<ServiceOrder[]> {
  const { data, error } = await supabase
    .from('service_orders')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getServiceOrder(id: string): Promise<ServiceOrderWithClient | null> {
  const { data, error } = await supabase
    .from('service_orders')
    .select('*, client:profiles!client_id(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createServiceOrder(order: {
  client_id: string;
  equipment: string;
  serial_number?: string;
  entry_date?: string;
  equipment_photo_url?: string;
  problem_description: string;
  estimated_completion?: string;
  has_multiple_items?: boolean;
  items?: Array<{
    equipment: string;
    serial_number?: string;
    description?: string;
  }>;
}): Promise<ServiceOrder> {
  // Generate order number
  const { data: orderNumber, error: numberError } = await supabase
    .rpc('generate_order_number');

  if (numberError) throw numberError;

  const { data, error } = await supabase
    .from('service_orders')
    .insert({
      client_id: order.client_id,
      equipment: order.equipment,
      serial_number: order.serial_number,
      entry_date: order.entry_date || new Date().toISOString(),
      equipment_photo_url: order.equipment_photo_url,
      problem_description: order.problem_description,
      estimated_completion: order.estimated_completion,
      has_multiple_items: order.has_multiple_items || false,
      order_number: orderNumber,
    })
    .select()
    .single();

  if (error) throw error;

  // Create initial status history
  await createOrderStatusHistory({
    order_id: data.id,
    status: 'received',
    notes: 'Ordem de serviço criada',
    created_by: order.client_id,
  });

  // Create additional items if provided
  if (order.items && order.items.length > 0) {
    await createServiceOrderItems(data.id, order.items);
  }

  return data;
}

export async function updateServiceOrder(
  id: string,
  updates: Partial<ServiceOrder>
): Promise<ServiceOrder> {
  const { data, error } = await supabase
    .from('service_orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateServiceOrderStatus(
  orderId: string,
  status: OrderStatus,
  notes: string | null,
  createdBy: string
): Promise<ServiceOrder> {
  const updates: Partial<ServiceOrder> = { status };
  
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('service_orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;

  // Create status history entry
  await createOrderStatusHistory({
    order_id: orderId,
    status,
    notes,
    created_by: createdBy,
  });

  return data;
}

// Atualizar desconto da ordem de serviço
export async function updateServiceOrderDiscount(
  orderId: string,
  discountAmount: number,
  discountReason: string
): Promise<ServiceOrder> {
  const { data: existingOrder, error: fetchError } = await supabase
    .from('service_orders')
    .select('labor_cost, parts_cost')
    .eq('id', orderId)
    .single();

  if (fetchError) throw fetchError;

  const laborCost = Number(existingOrder?.labor_cost) || 0;
  const partsCost = Number(existingOrder?.parts_cost) || 0;
  const subtotal = laborCost + partsCost;
  const totalFinal = Math.max(subtotal - (Number(discountAmount) || 0), 0);

  const { data, error } = await supabase
    .from('service_orders')
    .update({
      discount_amount: discountAmount,
      discount_reason: discountReason || null,
      total_cost: totalFinal,
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteServiceOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from('service_orders')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Service Order Items
export async function getServiceOrderItems(orderId: string): Promise<ServiceOrderItem[]> {
  const { data, error } = await supabase
    .from('service_order_items')
    .select('*')
    .eq('service_order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createServiceOrderItem(item: {
  service_order_id: string;
  equipment: string;
  serial_number?: string;
  description?: string;
}): Promise<ServiceOrderItem> {
  const { data, error } = await supabase
    .from('service_order_items')
    .insert({
      service_order_id: item.service_order_id,
      equipment: item.equipment,
      serial_number: item.serial_number || null,
      description: item.description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createServiceOrderItems(
  orderId: string,
  items: Array<{
    equipment: string;
    serial_number?: string;
    description?: string;
  }>
): Promise<ServiceOrderItem[]> {
  const itemsToInsert = items.map(item => ({
    service_order_id: orderId,
    equipment: item.equipment,
    serial_number: item.serial_number || null,
    description: item.description || null,
  }));

  const { data, error } = await supabase
    .from('service_order_items')
    .insert(itemsToInsert)
    .select();

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function updateServiceOrderItem(
  id: string,
  updates: Partial<ServiceOrderItem>
): Promise<ServiceOrderItem> {
  const { data, error } = await supabase
    .from('service_order_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteServiceOrderItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('service_order_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Order Status History
export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryWithUser[]> {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*, creator:profiles!created_by(*)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createOrderStatusHistory(history: {
  order_id: string;
  status: OrderStatus;
  notes: string | null;
  created_by: string | null;
}): Promise<OrderStatusHistory> {
  const { data, error } = await supabase
    .from('order_status_history')
    .insert(history)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Messages
export async function getOrderMessages(orderId: string): Promise<MessageWithSender[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(*)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createMessage(message: {
  order_id: string;
  sender_id: string;
  content: string;
  image_url?: string;
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      ...message,
      image_url: message.image_url || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMessage(messageId: string, content: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .update({ content })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
}

// Site Settings
export async function getAllSiteSettings(): Promise<SiteSetting[]> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*');

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getSiteSetting(key: string): Promise<any> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;
  return data?.value;
}

export async function updateSiteSetting(key: string, value: any): Promise<SiteSetting> {
  const { data, error } = await supabase
    .from('site_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Telegram Settings
export async function getTelegramSettings(): Promise<{ chat_id: string | null; enabled: boolean }> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('telegram_chat_id, telegram_notifications_enabled')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return {
    chat_id: data?.telegram_chat_id || null,
    enabled: data?.telegram_notifications_enabled || false,
  };
}

export async function updateTelegramSettings(chatId: string | null, enabled: boolean): Promise<void> {
  // Update all rows in site_settings table
  const { error } = await supabase
    .from('site_settings')
    .update({
      telegram_chat_id: chatId || null,
      telegram_notifications_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .not('id', 'is', null); // Update all rows

  if (error) throw error;
}

// Search Settings
export async function getSearchEnabled(): Promise<boolean> {
  const value = await getSiteSetting('search_enabled');
  return value === 'true' || value === true;
}

// Search functionality - busca em conteúdo público do site
export async function searchSiteContent(query: string): Promise<{
  settings: Array<{ type: string; title: string; content: string; sectionId?: string; url?: string; }>;
}> {
  if (!query || query.trim().length < 2) {
    return { settings: [] };
  }

  const searchTerm = query.toLowerCase().trim();
  
  // Buscar em todas as configurações do site
  const { data: settings, error } = await supabase
    .from('site_settings')
    .select('key, value');

  if (error) throw error;

  const results: Array<{ type: string; title: string; content: string; sectionId?: string; url?: string; }> = [];

  // Conteúdo estático das páginas para busca inteligente
  const staticContent = [
    {
      type: 'Serviços',
      title: 'Videogames - Nintendo, PlayStation, Xbox',
      content: 'Reparo especializado para todas as plataformas: PlayStation, Xbox, Nintendo e consoles retro. Manutenção, limpeza, troca de componentes e recuperação de consoles.',
      keywords: ['nintendo', 'playstation', 'xbox', 'videogame', 'console', 'switch', 'ps5', 'ps4', 'xbox series'],
      url: '/services',
      sectionId: 'services'
    },
    {
      type: 'Serviços',
      title: 'Notebooks, PCs e Macs',
      content: 'Diagnóstico completo, reparo avançado de periféricos, upgrades, modding e recuperação de dados. Especialistas em notebooks, computadores desktop e Macs.',
      keywords: ['notebook', 'computador', 'pc', 'mac', 'laptop', 'desktop', 'upgrade', 'dados', 'ssd', 'memória'],
      url: '/services',
      sectionId: 'services'
    },
    {
      type: 'Serviços',
      title: 'Eletrônicos - TVs, Placas de Vídeo',
      content: 'Smart TVs, placas de vídeo, recuperação de placas eletrônicas e reballing profissional. Reparos em eletrônicos de alta complexidade.',
      keywords: ['tv', 'smart tv', 'placa de vídeo', 'gpu', 'eletrônico', 'reballing', 'placa mãe'],
      url: '/services',
      sectionId: 'services'
    },
    {
      type: 'Página',
      title: 'Sobre a InfoShire',
      content: 'Mais de 24 anos de experiência em assistência técnica especializada. Laboratório técnico equipado, diagnóstico transparente e comunicação direta com o técnico.',
      keywords: ['sobre', 'empresa', 'experiência', 'história', 'equipe', 'laboratório'],
      url: '/about',
      sectionId: 'about'
    },
    {
      type: 'Contato',
      title: 'Entre em Contato',
      content: 'Fale conosco através do WhatsApp, telefone, e-mail ou visite nossa loja física. Estamos prontos para atender você.',
      keywords: ['contato', 'telefone', 'email', 'whatsapp', 'endereço', 'localização'],
      url: '/contact',
      sectionId: 'contact'
    },
    {
      type: 'Funcionalidade',
      title: 'Rastrear Ordem de Serviço',
      content: 'Acompanhe em tempo real o status do reparo do seu equipamento. Digite seu e-mail ou telefone para rastrear sua OS.',
      keywords: ['rastrear', 'acompanhar', 'ordem', 'serviço', 'os', 'status', 'reparo'],
      url: '/rastrear-os',
    },
    {
      type: 'Funcionalidade',
      title: 'Cadastro de Cliente',
      content: 'Crie sua conta para acompanhar suas ordens de serviço, receber notificações e conversar diretamente com o técnico.',
      keywords: ['cadastro', 'registro', 'conta', 'cliente', 'criar conta'],
      url: '/register',
    },
  ];

  // Buscar em conteúdo estático primeiro (prioridade)
  staticContent.forEach((item) => {
    const titleMatch = item.title.toLowerCase().includes(searchTerm);
    const contentMatch = item.content.toLowerCase().includes(searchTerm);
    const keywordMatch = item.keywords.some(keyword => 
      keyword.includes(searchTerm) || searchTerm.includes(keyword)
    );

    if (titleMatch || contentMatch || keywordMatch) {
      results.push({
        type: item.type,
        title: item.title,
        content: item.content,
        sectionId: item.sectionId,
        url: item.url,
      });
    }
  });

  // Mapear configurações para resultados de busca com seções
  const settingsMap: Record<string, { title: string; type: string; sectionId?: string }> = {
    site_name: { title: 'Nome do Site', type: 'Informação', sectionId: 'hero' },
    home_hero_title: { title: 'Página Inicial - Título Principal', type: 'Página', sectionId: 'hero' },
    home_hero_subtitle: { title: 'Página Inicial - Subtítulo', type: 'Página', sectionId: 'hero' },
    home_services_title: { title: 'Serviços - Título', type: 'Serviços', sectionId: 'services' },
    home_services_subtitle: { title: 'Serviços - Descrição', type: 'Serviços', sectionId: 'services' },
    service_1_title: { title: 'Serviço 1 - Título', type: 'Serviços', sectionId: 'services' },
    service_1_description: { title: 'Serviço 1 - Descrição', type: 'Serviços', sectionId: 'services' },
    service_2_title: { title: 'Serviço 2 - Título', type: 'Serviços', sectionId: 'services' },
    service_2_description: { title: 'Serviço 2 - Descrição', type: 'Serviços', sectionId: 'services' },
    service_3_title: { title: 'Serviço 3 - Título', type: 'Serviços', sectionId: 'services' },
    service_3_description: { title: 'Serviço 3 - Descrição', type: 'Serviços', sectionId: 'services' },
    service_4_title: { title: 'Serviço 4 - Título', type: 'Serviços', sectionId: 'services' },
    service_4_description: { title: 'Serviço 4 - Descrição', type: 'Serviços', sectionId: 'services' },
    service_5_title: { title: 'Serviço 5 - Título', type: 'Serviços', sectionId: 'services' },
    service_5_description: { title: 'Serviço 5 - Descrição', type: 'Serviços', sectionId: 'services' },
    service_6_title: { title: 'Serviço 6 - Título', type: 'Serviços', sectionId: 'services' },
    service_6_description: { title: 'Serviço 6 - Descrição', type: 'Serviços', sectionId: 'services' },
    about_title: { title: 'Sobre Nós - Título', type: 'Página', sectionId: 'about' },
    about_content: { title: 'Sobre Nós - Conteúdo', type: 'Página', sectionId: 'about' },
    differentials_title: { title: 'Diferenciais - Título', type: 'Página', sectionId: 'differentials' },
    differential_1_title: { title: 'Diferencial 1', type: 'Diferenciais', sectionId: 'differentials' },
    differential_1_description: { title: 'Diferencial 1 - Descrição', type: 'Diferenciais', sectionId: 'differentials' },
    differential_2_title: { title: 'Diferencial 2', type: 'Diferenciais', sectionId: 'differentials' },
    differential_2_description: { title: 'Diferencial 2 - Descrição', type: 'Diferenciais', sectionId: 'differentials' },
    differential_3_title: { title: 'Diferencial 3', type: 'Diferenciais', sectionId: 'differentials' },
    differential_3_description: { title: 'Diferencial 3 - Descrição', type: 'Diferenciais', sectionId: 'differentials' },
    differential_4_title: { title: 'Diferencial 4', type: 'Diferenciais', sectionId: 'differentials' },
    differential_4_description: { title: 'Diferencial 4 - Descrição', type: 'Diferenciais', sectionId: 'differentials' },
    contact_title: { title: 'Contato - Título', type: 'Contato', sectionId: 'contact' },
    contact_email: { title: 'E-mail de Contato', type: 'Contato', sectionId: 'contact' },
    contact_phone: { title: 'Telefone de Contato', type: 'Contato', sectionId: 'contact' },
    contact_address: { title: 'Endereço', type: 'Contato', sectionId: 'contact' },
    business_hours: { title: 'Horário de Funcionamento', type: 'Contato', sectionId: 'contact' },
    testimonials_title: { title: 'Depoimentos - Título', type: 'Página', sectionId: 'testimonials' },
    cta_title: { title: 'Chamada para Ação - Título', type: 'Página', sectionId: 'cta' },
    cta_subtitle: { title: 'Chamada para Ação - Subtítulo', type: 'Página', sectionId: 'cta' },
  };

  // Filtrar configurações que contenham o termo de busca (case-insensitive)
  settings?.forEach((setting) => {
    const key = setting.key.toLowerCase();
    const value = String(setting.value || '').toLowerCase();
    const keyInfo = settingsMap[setting.key];
    
    // Buscar no valor ou no título da configuração
    if (value.includes(searchTerm) || (keyInfo?.title.toLowerCase().includes(searchTerm))) {
      const title = keyInfo?.title || setting.key;
      const type = keyInfo?.type || 'Configuração';
      const sectionId = keyInfo?.sectionId;
      
      // Evitar duplicatas
      const isDuplicate = results.some(r => r.title === title && r.content === String(setting.value || '').substring(0, 200));
      
      if (!isDuplicate) {
        results.push({
          type,
          title,
          content: String(setting.value || '').substring(0, 200),
          sectionId,
        });
      }
    }
  });

  return { settings: results };
}

// Dashboard Stats
export async function getDashboardStats() {
  const { data: orders, error } = await supabase
    .from('service_orders')
    .select('status');

  if (error) throw error;

  const stats = {
    total: orders?.length || 0,
    received: 0,
    analyzing: 0,
    awaiting_approval: 0,
    in_repair: 0,
    awaiting_parts: 0,
    completed: 0,
    ready_for_pickup: 0,
  };

  orders?.forEach((order) => {
    stats[order.status as keyof typeof stats]++;
  });

  return stats;
}

export async function getFinancialStats(month?: number, year?: number) {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1; // 1-12
  const targetYear = year ?? now.getFullYear();
  
  // Calculate start and end dates for the month
  const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString();
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59).toISOString();
  
  // Query approval_history table to get ALL approved budgets (incremental)
  const { data: approvals, error } = await supabase
    .from('approval_history')
    .select('labor_cost, parts_cost, total_cost, approved_at')
    .gte('approved_at', startDate)
    .lte('approved_at', endDate);

  if (error) throw error;

  const stats = {
    totalRevenue: 0,
    laborRevenue: 0,
    partsRevenue: 0,
    approvedOrdersCount: 0,
    month: targetMonth,
    year: targetYear,
  };

  // Sum ALL approvals in the period (incremental)
  approvals?.forEach((approval) => {
    stats.totalRevenue += approval.total_cost || 0;
    stats.laborRevenue += approval.labor_cost || 0;
    stats.partsRevenue += approval.parts_cost || 0;
    stats.approvedOrdersCount++;
  });

  return stats;
}

// Order Images
export async function uploadOrderImage(
  orderId: string,
  file: File,
  description?: string
): Promise<{ image_url: string; id: string }> {
  console.log('📤 Iniciando upload de imagem:', { orderId, fileName: file.name, fileSize: file.size });
  
  // Compress image if needed
  const compressedFile = await compressImage(file);
  console.log('✅ Imagem comprimida:', { originalSize: file.size, compressedSize: compressedFile.size });
  
  // Generate unique filename
  const fileExt = compressedFile.name.split('.').pop();
  const fileName = `${orderId}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;
  console.log('📝 Nome do arquivo gerado:', filePath);

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('app-8pj0bpgfx6v5_order_images')
    .upload(filePath, compressedFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('❌ Erro no upload para storage:', uploadError);
    throw uploadError;
  }
  console.log('✅ Upload para storage concluído:', uploadData);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('app-8pj0bpgfx6v5_order_images')
    .getPublicUrl(uploadData.path);

  const imageUrl = urlData.publicUrl;
  console.log('🔗 URL pública gerada:', imageUrl);

  // Save to database
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('order_images')
    .insert({
      order_id: orderId,
      image_url: imageUrl,
      description: description || null,
      uploaded_by: user.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao salvar no banco de dados:', error);
    throw error;
  }
  
  console.log('✅ Imagem salva no banco de dados:', data);
  return { image_url: imageUrl, id: data.id };
}

export async function getOrderImages(orderId: string) {
  console.log('🖼️ Buscando imagens da ordem:', orderId);
  
  const { data, error } = await supabase
    .from('order_images')
    .select(`
      *,
      uploader:profiles!order_images_uploaded_by_fkey(*)
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar imagens:', error);
    throw error;
  }
  
  console.log('✅ Imagens encontradas:', data?.length || 0, data);
  return Array.isArray(data) ? data : [];
}

export async function deleteOrderImage(imageId: string): Promise<void> {
  // Get image data first
  const { data: image, error: fetchError } = await supabase
    .from('order_images')
    .select('image_url')
    .eq('id', imageId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!image) throw new Error('Imagem não encontrada');

  // Extract filename from URL
  const urlParts = image.image_url.split('/');
  const fileName = urlParts[urlParts.length - 1];

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('app-8pj0bpgfx6v5_order_images')
    .remove([fileName]);

  if (storageError) throw storageError;

  // Delete from database
  const { error: dbError } = await supabase
    .from('order_images')
    .delete()
    .eq('id', imageId);

  if (dbError) throw dbError;
}

// Image compression helper
async function compressImage(file: File): Promise<File> {
  // Tamanho máximo: 800KB
  const MAX_SIZE = 800 * 1024;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar para max 1280x720
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 720;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Falha ao criar contexto do canvas');
            resolve(file);
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);

          // Função recursiva para comprimir até atingir o tamanho máximo
          const tryCompress = (quality: number, attempt: number = 0) => {
            // Limite de tentativas para evitar loop infinito
            if (attempt > 20) {
              console.warn('Limite de tentativas atingido, usando última compressão');
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    const finalFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                      type: 'image/webp',
                      lastModified: Date.now(),
                    });
                    resolve(finalFile);
                  } else {
                    // Fallback: retornar arquivo original se tudo falhar
                    resolve(file);
                  }
                },
                'image/webp',
                0.1
              );
              return;
            }

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  // Se falhar, tentar com qualidade menor
                  if (quality > 0.05) {
                    tryCompress(quality - 0.1, attempt + 1);
                  } else {
                    // Último recurso: retornar arquivo original
                    resolve(file);
                  }
                  return;
                }

                console.log(`Tentativa ${attempt + 1} - Qualidade ${quality.toFixed(2)}: ${(blob.size / 1024).toFixed(0)}KB`);
                
                // Se ainda está muito grande e a qualidade pode ser reduzida
                if (blob.size > MAX_SIZE && quality > 0.05) {
                  tryCompress(quality - 0.1, attempt + 1);
                } else {
                  const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                    type: 'image/webp',
                    lastModified: Date.now(),
                  });
                  console.log(`Compressão final: ${(compressedFile.size / 1024).toFixed(0)}KB`);
                  resolve(compressedFile);
                }
              },
              'image/webp',
              quality
            );
          };

          // Começar com qualidade 0.7
          tryCompress(0.7);
        } catch (error) {
          console.error('Erro durante compressão:', error);
          // Fallback: retornar arquivo original
          resolve(file);
        }
      };
      
      img.onerror = () => {
        console.error('Erro ao carregar imagem');
        // Fallback: retornar arquivo original
        resolve(file);
      };
    };
    
    reader.onerror = () => {
      console.error('Erro ao ler arquivo');
      // Fallback: retornar arquivo original
      resolve(file);
    };
  });
}

// ============================================
// POPUP CONFIG
// ============================================

export async function getPopupConfig(): Promise<PopupConfig | null> {
  const { data, error } = await supabase
    .from('popup_config')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updatePopupConfig(
  id: string,
  updates: Partial<PopupConfig>
): Promise<PopupConfig> {
  const { data, error } = await supabase
    .from('popup_config')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// DELETE FUNCTIONS
// ============================================

export async function deleteProfile(userId: string): Promise<void> {
  // This will call the Edge Function to delete from auth.users
  // The database profile will be deleted via CASCADE
  const { error } = await supabase.functions.invoke('delete-user', {
    body: JSON.stringify({ userId }),
  });

  if (error) {
    const errorMsg = await error?.context?.text();
    throw new Error(errorMsg || error.message || 'Erro ao deletar usuário');
  }
}

// ============================================
// EMAIL CAMPAIGNS
// ============================================

export async function sendEmailCampaign(data: {
  subject: string;
  body: string;
  recipientIds: string[];
  imageUrl?: string;
}): Promise<unknown> {
  const { data: responseData, error } = await supabase.functions.invoke('send-email-campaign', {
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (error) {
    const errorMsg = await resolveFunctionErrorMessage(error);
    if (/fetch failed|failed to fetch|networkerror/i.test(errorMsg)) {
      throw new Error(
        'Falha de rede/CORS ao chamar send-email-campaign. Verifique CORS da Edge Function.'
      );
    }
    throw new Error(errorMsg || error.message || 'Erro ao enviar campanha de email');
  }

  return responseData;
}

async function resolveFunctionErrorMessage(error: any): Promise<string> {
  if (error?.context?.error) {
    return String(error.context.error);
  }
  if (error?.message) {
    return String(error.message);
  }
  return JSON.stringify(error);
}

export async function getEmailCampaigns(): Promise<EmailCampaignWithSender[]> {
  const { data, error } = await supabase
    .from('email_campaigns')
    .select(`
      *,
      sender:profiles!email_campaigns_sent_by_fkey(name, email)
    `)
    .order('sent_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// Email Configuration
export async function getEmailConfig(): Promise<EmailConfig | null> {
  const { data, error } = await supabase
    .from('email_config')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertEmailConfig(config: Partial<EmailConfig>): Promise<EmailConfig> {
  // First, get existing config
  const existing = await getEmailConfig();
  
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('email_config')
      .update(config)
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('email_config')
      .insert({ ...config, is_active: true })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export async function testEmailConfig(testEmail: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: testEmail,
      subject: 'Teste de Configuração de Email - InfoShire',
      html: '<h1>Teste de Email</h1><p>Se você recebeu este email, sua configuração está funcionando corretamente!</p>',
      isTest: true,
    },
  });

  if (error) {
    const errorMsg = await error?.context?.text();
    return {
      success: false,
      message: errorMsg || error?.message || 'Erro ao enviar email de teste',
    };
  }

  return {
    success: true,
    message: 'Email de teste enviado com sucesso!',
  };
}

// Financial Reports
export interface FinancialSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  completedOrders: number;
  pendingOrders: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

export async function getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
  let query = supabase
    .from('service_orders')
    .select('total_cost, status, approved_at, budget_approved');

  if (startDate) {
    query = query.gte('approved_at', startDate);
  }
  if (endDate) {
    query = query.lte('approved_at', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  const orders = Array.isArray(data) ? data : [];
  
  // Calcular receita total apenas de ordens aprovadas
  const approvedOrders = orders.filter(o => o.budget_approved && o.total_cost);
  const totalRevenue = approvedOrders.reduce((sum, order) => {
    const cost = Number(order.total_cost) || 0;
    return sum + cost;
  }, 0);

  const completedOrders = orders.filter(o => 
    o.status === 'completed' || o.status === 'ready_for_pickup'
  ).length;

  const pendingOrders = orders.filter(o => 
    o.status !== 'completed' && o.status !== 'ready_for_pickup'
  ).length;

  return {
    totalRevenue,
    totalOrders: orders.length,
    averageOrderValue: approvedOrders.length > 0 ? totalRevenue / approvedOrders.length : 0,
    completedOrders,
    pendingOrders,
  };
}

export async function getDailyRevenue(startDate: string, endDate: string): Promise<DailyRevenue[]> {
  const { data, error } = await supabase
    .from('service_orders')
    .select('approved_at, total_cost, budget_approved')
    .gte('approved_at', startDate)
    .lte('approved_at', endDate)
    .eq('budget_approved', true)
    .not('total_cost', 'is', null)
    .order('approved_at', { ascending: true });

  if (error) throw error;

  const orders = Array.isArray(data) ? data : [];

  // Agrupar por dia
  const dailyMap = new Map<string, { revenue: number; orders: number }>();

  orders.forEach(order => {
    if (!order.approved_at) return;
    
    const date = new Date(order.approved_at).toISOString().split('T')[0];
    const cost = Number(order.total_cost) || 0;
    const revenue = cost;

    if (dailyMap.has(date)) {
      const existing = dailyMap.get(date)!;
      dailyMap.set(date, {
        revenue: existing.revenue + revenue,
        orders: existing.orders + 1,
      });
    } else {
      dailyMap.set(date, { revenue, orders: 1 });
    }
  });

  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMonthlyRevenue(year?: number): Promise<MonthlyRevenue[]> {
  const targetYear = year || new Date().getFullYear();
  const startDate = `${targetYear}-01-01`;
  const endDate = `${targetYear}-12-31`;

  const { data, error } = await supabase
    .from('service_orders')
    .select('approved_at, total_cost, budget_approved')
    .gte('approved_at', startDate)
    .lte('approved_at', endDate)
    .eq('budget_approved', true)
    .not('total_cost', 'is', null)
    .order('approved_at', { ascending: true });

  if (error) throw error;

  const orders = Array.isArray(data) ? data : [];

  // Agrupar por mês
  const monthlyMap = new Map<string, { revenue: number; orders: number }>();

  orders.forEach(order => {
    if (!order.approved_at) return;
    
    // Extract year-month directly from the ISO string to avoid timezone issues
    // approved_at format: "2026-01-15T12:00:00.000Z"
    // Extract: "2026-01"
    const month = order.approved_at.substring(0, 7); // Gets "YYYY-MM"
    const cost = Number(order.total_cost) || 0;
    const revenue = cost;

    if (monthlyMap.has(month)) {
      const existing = monthlyMap.get(month)!;
      monthlyMap.set(month, {
        revenue: existing.revenue + revenue,
        orders: existing.orders + 1,
      });
    } else {
      monthlyMap.set(month, { revenue, orders: 1 });
    }
  });

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      revenue: data.revenue,
      orders: data.orders,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getFinancialOrdersDetails(startDate?: string, endDate?: string) {
  let query = supabase
    .from('service_orders')
    .select(`
      *,
      client:profiles!service_orders_client_id_fkey(*)
    `)
    .eq('budget_approved', true)
    .not('total_cost', 'is', null)
    .order('approved_at', { ascending: false });

  if (startDate) {
    query = query.gte('approved_at', startDate);
  }
  if (endDate) {
    query = query.lte('approved_at', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// ============================================
// FUNÇÕES DE GARANTIA
// ============================================

/**
 * Buscar garantia por cliente e equipamento
 * Retorna todas as OSs do cliente para o equipamento especificado
 * Destaca se alguma está em garantia
 */
export async function searchWarranty(params: {
  clientId?: string;
  equipment?: string;
  serialNumber?: string;
}): Promise<ServiceOrderWithClient[]> {
  let query = supabase
    .from('service_orders')
    .select(`
      *,
      client:profiles!client_id(*)
    `)
    .order('created_at', { ascending: false });

  // Filtrar por cliente se fornecido
  if (params.clientId) {
    query = query.eq('client_id', params.clientId);
  }

  // Filtrar por equipamento se fornecido
  if (params.equipment) {
    query = query.ilike('equipment', `%${params.equipment}%`);
  }

  // Filtrar por número de série se fornecido
  if (params.serialNumber) {
    query = query.ilike('serial_number', `%${params.serialNumber}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * Listar todas as OSs em garantia
 * Com filtros opcionais por cliente, técnico, período
 */
export async function getOrdersInWarranty(filters?: {
  clientId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ServiceOrderWithClient[]> {
  let query = supabase
    .from('service_orders')
    .select(`
      *,
      client:profiles!client_id(*)
    `)
    .eq('em_garantia', true)
    .order('data_fim_garantia', { ascending: true });

  // Filtrar por cliente se fornecido
  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  // Filtrar por período de conclusão se fornecido
  if (filters?.startDate) {
    query = query.gte('data_conclusao', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('data_conclusao', filters.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * Obter garantias que expirarão nos próximos 7 dias
 * Usa a view warranties_expiring_soon criada no banco
 */
export async function getWarrantiesExpiringSoon() {
  const { data, error } = await supabase
    .from('warranties_expiring_soon')
    .select('*')
    .order('data_fim_garantia', { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * Atualizar data de retirada de uma OS
 * Chamado quando o cliente retira o equipamento
 */
export async function updateOrderPickupDate(orderId: string, pickupDate: string) {
  const { data, error } = await supabase
    .from('service_orders')
    .update({ data_retirada: pickupDate })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Marcar OS como retorno de garantia
 * Usado quando um cliente retorna com o mesmo equipamento dentro do período de garantia
 */
export async function markAsWarrantyReturn(orderId: string, isWarrantyReturn: boolean) {
  const { data, error } = await supabase
    .from('service_orders')
    .update({ retorno_garantia: isWarrantyReturn })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Invocar edge function para verificação manual de garantias
 * Normalmente executado automaticamente via cron, mas pode ser chamado manualmente
 */
export async function checkWarrantiesManually() {
  const { data, error } = await supabase.functions.invoke('check-warranties', {
    body: {},
  });

  if (error) {
    const errorMsg = await error?.context?.text();
    console.error('Erro ao verificar garantias:', errorMsg || error?.message);
    throw error;
  }

  return data;
}

// ============================================
// SYSTEM SETTINGS
// ============================================

/**
 * Obter configuração do sistema por chave
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .maybeSingle();

    if (error) throw error;
    return data?.setting_value || null;
  } catch (error) {
    handleApiError(error, 'getSystemSetting');
    return null;
  }
}

/**
 * Obter todas as configurações do sistema
 */
export async function getAllSystemSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleApiError(error, 'getAllSystemSettings');
    return [];
  }
}

/**
 * Atualizar configuração do sistema
 */
export async function updateSystemSetting(key: string, value: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('system_settings')
      .update({ setting_value: value })
      .eq('setting_key', key);

    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'updateSystemSetting');
    return false;
  }
}

/**
 * Substituir variáveis no template de WhatsApp
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  
  // Support both variable formats for flexibility
  // e.g., {nome_cliente} and {cliente_nome} both work
  const variableAliases: Record<string, string[]> = {
    'nome_cliente': ['nome_cliente', 'cliente_nome'],
    'numero_os': ['numero_os', 'os_numero'],
    'equipamento': ['equipamento', 'equipment'],
    'endereco': ['endereco', 'address'],
    'horario': ['horario', 'business_hours'],
    'data_conclusao': ['data_conclusao', 'completion_date'],
    'data_fim_garantia': ['data_fim_garantia', 'warranty_end_date'],
  };
  
  Object.keys(variables).forEach(key => {
    const value = variables[key] || '';
    const aliases = variableAliases[key] || [key];
    
    // Replace all alias formats
    aliases.forEach(alias => {
      const placeholder = `{${alias}}`;
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
  });
  
  return result;
}

/**
 * Enviar mensagem WhatsApp para cliente (através da API externa)
 * Compatível com WhatsApp e WhatsApp Business
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<boolean> {
  try {
    // Remover caracteres não numéricos do telefone
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Verificar se o telefone tem o formato correto (mínimo 10 dígitos)
    if (cleanPhone.length < 10) {
      console.error('Número de telefone inválido:', phone);
      return false;
    }

    // Adicionar código do país se não tiver (Brasil = 55)
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    // Codificar mensagem para URL preservando emojis
    const encodedMessage = encodeURIComponent(message);

    // Usar wa.me que funciona tanto para WhatsApp quanto WhatsApp Business
    // O sistema detecta automaticamente qual versão o usuário tem instalada
    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodedMessage}`;
    
    // Abrir diretamente em nova aba sem confirmação
    if (typeof window !== 'undefined') {
      // Usar window.open com noopener e noreferrer para segurança
      const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      
      // Verificar se o pop-up foi bloqueado
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.warn('Pop-up bloqueado. Tentando abrir na mesma aba...');
        window.location.href = whatsappUrl;
      }
    }

    return true;
  } catch (error) {
    handleApiError(error, 'sendWhatsAppMessage');
    return false;
  }
}

/**
 * Enviar notificação de OS finalizada via WhatsApp
 * Sempre envia quando chamada, independente da configuração de auto-send
 */
export async function sendOrderCompletedWhatsApp(orderId: string): Promise<boolean> {
  try {
    // Buscar dados da ordem
    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:profiles!service_orders_client_id_fkey(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    if (!order || !order.client) {
      console.error('Ordem ou cliente não encontrado');
      return false;
    }

    // Buscar template
    const template = await getSystemSetting('whatsapp_template_order_completed');
    if (!template) {
      console.error('Template de WhatsApp não encontrado');
      return false;
    }

    // Formatar datas
    const dataConclusao = order.data_conclusao 
      ? format(new Date(order.data_conclusao), "dd/MM/yyyy", { locale: ptBR })
      : format(new Date(), "dd/MM/yyyy", { locale: ptBR });

    const dataFimGarantia = order.data_fim_garantia
      ? format(new Date(order.data_fim_garantia), "dd/MM/yyyy", { locale: ptBR })
      : format(addDays(new Date(), 90), "dd/MM/yyyy", { locale: ptBR });

    // Preparar variáveis
    const variables = {
      nome_cliente: order.client.name || 'Cliente',
      numero_os: order.order_number?.toString() || 'N/A',
      equipamento: order.equipment || 'Equipamento',
      data_conclusao: dataConclusao,
      data_fim_garantia: dataFimGarantia,
    };

    // Substituir variáveis no template
    const message = replaceTemplateVariables(template, variables);

    // Enviar WhatsApp
    const phone = order.client.phone || '';
    if (!phone) {
      console.error('Cliente sem telefone cadastrado');
      return false;
    }

    return await sendWhatsAppMessage(phone, message);
  } catch (error) {
    handleApiError(error, 'sendOrderCompletedWhatsApp');
    return false;
  }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Obter resumo de analytics do dashboard
 */
export async function getAnalyticsSummary(days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total de sessões (visitas)
    const { count: totalVisits } = await supabase
      .from('analytics_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('is_bot', false)
      .gte('created_at', startDate.toISOString());

    // Visitantes únicos (sessões únicas)
    const { data: uniqueVisitors } = await supabase
      .from('analytics_sessions')
      .select('session_id')
      .eq('is_bot', false)
      .gte('created_at', startDate.toISOString());

    // Total de visualizações de página
    const { count: totalPageviews } = await supabase
      .from('analytics_pageviews')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Total de eventos (cliques importantes)
    const { count: totalEvents } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Tempo médio de permanência
    const { data: sessions } = await supabase
      .from('analytics_sessions')
      .select('duration_seconds')
      .eq('is_bot', false)
      .gte('created_at', startDate.toISOString());

    const avgDuration = sessions && sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length)
      : 0;

    return {
      totalVisits: totalVisits || 0,
      uniqueVisitors: uniqueVisitors?.length || 0,
      totalPageviews: totalPageviews || 0,
      totalEvents: totalEvents || 0,
      avgDuration,
      days,
    };
  } catch (error) {
    handleApiError(error, 'getAnalyticsSummary');
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      totalPageviews: 0,
      totalEvents: 0,
      avgDuration: 0,
      days,
    };
  }
}

/**
 * Obter origens de tráfego
 */
export async function getTrafficSources(days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics_sources')
      .select('source_type')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Contar por tipo de origem
    const sourceCounts: Record<string, number> = {};
    data?.forEach(source => {
      const type = source.source_type || 'other';
      sourceCounts[type] = (sourceCounts[type] || 0) + 1;
    });

    // Converter para array e calcular percentuais
    const total = data?.length || 0;
    const sources = Object.entries(sourceCounts).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

    // Ordenar por contagem
    sources.sort((a, b) => b.count - a.count);

    return sources;
  } catch (error) {
    handleApiError(error, 'getTrafficSources');
    return [];
  }
}

/**
 * Obter páginas mais acessadas
 */
export async function getTopPages(days: number = 30, limit: number = 10) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics_pageviews')
      .select('page_path, page_title')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Contar por página
    const pageCounts: Record<string, { count: number; title: string }> = {};
    data?.forEach(page => {
      const path = page.page_path || '/';
      if (!pageCounts[path]) {
        pageCounts[path] = { count: 0, title: page.page_title || path };
      }
      pageCounts[path].count++;
    });

    // Converter para array
    const pages = Object.entries(pageCounts).map(([path, data]) => ({
      path,
      title: data.title,
      views: data.count,
    }));

    // Ordenar por visualizações e limitar
    pages.sort((a, b) => b.views - a.views);
    return pages.slice(0, limit);
  } catch (error) {
    handleApiError(error, 'getTopPages');
    return [];
  }
}

/**
 * Obter eventos de cliques
 */
export async function getClickEvents(days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type, event_label, page_path')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Contar por tipo de evento
    const eventCounts: Record<string, number> = {};
    data?.forEach(event => {
      const type = event.event_type || 'other';
      eventCounts[type] = (eventCounts[type] || 0) + 1;
    });

    // Converter para array
    const events = Object.entries(eventCounts).map(([type, count]) => ({
      type,
      count,
    }));

    // Ordenar por contagem
    events.sort((a, b) => b.count - a.count);

    return events;
  } catch (error) {
    handleApiError(error, 'getClickEvents');
    return [];
  }
}

/**
 * Obter visitas por dia (para gráfico)
 */
export async function getVisitsByDay(days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics_sessions')
      .select('created_at')
      .eq('is_bot', false)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Agrupar por dia
    const visitsByDay: Record<string, number> = {};
    data?.forEach(session => {
      const date = format(new Date(session.created_at), 'yyyy-MM-dd');
      visitsByDay[date] = (visitsByDay[date] || 0) + 1;
    });

    // Preencher dias sem visitas
    const result: Array<{ date: string; visits: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      result.push({
        date: dateStr,
        visits: visitsByDay[dateStr] || 0,
      });
    }

    return result;
  } catch (error) {
    handleApiError(error, 'getVisitsByDay');
    return [];
  }
}

/**
 * Obter localizações dos visitantes
 */
export async function getVisitorLocations(days: number = 30, limit: number = 10) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics_sessions')
      .select('city, country')
      .eq('is_bot', false)
      .gte('created_at', startDate.toISOString())
      .not('city', 'is', null);

    if (error) throw error;

    // Contar por cidade
    const locationCounts: Record<string, { city: string; country: string; count: number }> = {};
    data?.forEach(session => {
      const key = `${session.city}, ${session.country}`;
      if (!locationCounts[key]) {
        locationCounts[key] = {
          city: session.city || 'Desconhecida',
          country: session.country || 'Desconhecido',
          count: 0,
        };
      }
      locationCounts[key].count++;
    });

    // Converter para array
    const locations = Object.values(locationCounts);

    // Ordenar por contagem e limitar
    locations.sort((a, b) => b.count - a.count);
    return locations.slice(0, limit);
  } catch (error) {
    handleApiError(error, 'getVisitorLocations');
    return [];
  }
}

// ============================================
// DASHBOARD ALERTS & NOTIFICATIONS
// ============================================

/**
 * Obter alertas e notificações do dashboard para ações rápidas
 */
export async function getDashboardAlerts() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Buscar todas as ordens
    const { data: orders, error: ordersError } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:profiles!service_orders_client_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    const alerts: any[] = [];

    // 1. Ordens aguardando aprovação (URGENTE - SEMPRE VISÍVEL)
    const awaitingApproval = (orders || []).filter(o => o.status === 'awaiting_approval');
    if (awaitingApproval.length > 0) {
      alerts.push({
        id: 'awaiting-approval',
        type: 'urgent',
        title: '💰 Ordens Aguardando Aprovação',
        description: `${awaitingApproval.length} ${awaitingApproval.length === 1 ? 'cliente aguarda' : 'clientes aguardam'} seu orçamento`,
        count: awaitingApproval.length,
        icon: 'clock',
        color: 'yellow',
        action: 'Ver Ordens',
        link: '/admin/orders?status=awaiting_approval',
        orders: awaitingApproval.slice(0, 3),
        dismissible: false, // Nunca pode ser dispensado
      });
    }

    // 2. Ordens atrasadas (data estimada de conclusão passou)
    const overdueOrders = (orders || []).filter(o => {
      if (!o.estimated_completion_date) return false;
      if (o.status === 'completed' || o.status === 'ready_for_pickup' || o.status === 'delivered') return false;
      return new Date(o.estimated_completion_date) < now;
    });
    if (overdueOrders.length > 0) {
      alerts.push({
        id: 'overdue-orders',
        type: 'urgent',
        title: '⚠️ Ordens Atrasadas',
        description: `${overdueOrders.length} ${overdueOrders.length === 1 ? 'ordem está' : 'ordens estão'} com prazo vencido`,
        count: overdueOrders.length,
        icon: 'alert',
        color: 'red',
        action: 'Ver Atrasadas',
        link: '/admin/orders',
        orders: overdueOrders.slice(0, 3),
        dismissible: true,
      });
    }

    // 3. Ordens em análise há mais de 2 dias (precisa orçar)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const pendingAnalysis = (orders || []).filter(o => {
      if (o.status !== 'analyzing') return false;
      return new Date(o.created_at) < twoDaysAgo;
    });
    if (pendingAnalysis.length > 0) {
      alerts.push({
        id: 'pending-analysis',
        type: 'warning',
        title: '🔍 Análises Pendentes',
        description: `${pendingAnalysis.length} ${pendingAnalysis.length === 1 ? 'ordem precisa' : 'ordens precisam'} de orçamento`,
        count: pendingAnalysis.length,
        icon: 'clock',
        color: 'orange',
        action: 'Orçar Agora',
        link: '/admin/orders?status=analyzing',
        orders: pendingAnalysis.slice(0, 3),
        dismissible: true,
      });
    }

    // 4. Ordens em reparo há muito tempo (mais de 10 dias)
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const longRepairOrders = (orders || []).filter(o => {
      if (o.status !== 'in_repair' && o.status !== 'awaiting_parts') return false;
      return new Date(o.created_at) < tenDaysAgo;
    });
    if (longRepairOrders.length > 0) {
      alerts.push({
        id: 'long-repair',
        type: 'warning',
        title: '🔧 Reparos Demorados',
        description: `${longRepairOrders.length} ${longRepairOrders.length === 1 ? 'ordem está' : 'ordens estão'} em reparo há mais de 10 dias`,
        count: longRepairOrders.length,
        icon: 'clock',
        color: 'orange',
        action: 'Verificar',
        link: '/admin/orders',
        orders: longRepairOrders.slice(0, 3),
        dismissible: true,
      });
    }

    // 5. Ordens prontas para retirada (mais de 2 dias)
    const twoDaysAgoPickup = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const readyForPickup = (orders || []).filter(o => {
      if (o.status !== 'ready_for_pickup') return false;
      const completionDate = o.data_conclusao ? new Date(o.data_conclusao) : new Date(o.updated_at);
      return completionDate < twoDaysAgoPickup;
    });
    if (readyForPickup.length > 0) {
      alerts.push({
        id: 'ready-pickup',
        type: 'warning',
        title: '📦 Aguardando Retirada',
        description: `${readyForPickup.length} ${readyForPickup.length === 1 ? 'ordem pronta' : 'ordens prontas'} há mais de 2 dias`,
        count: readyForPickup.length,
        icon: 'package',
        color: 'orange',
        action: 'Contatar Clientes',
        link: '/admin/orders?status=ready_for_pickup',
        orders: readyForPickup.slice(0, 3),
        dismissible: true,
      });
    }

    // 6. Ordens aprovadas aguardando início do reparo
    const approvedPending = (orders || []).filter(o => o.status === 'approved');
    if (approvedPending.length > 0) {
      alerts.push({
        id: 'approved-pending',
        type: 'info',
        title: '✅ Aprovadas - Iniciar Reparo',
        description: `${approvedPending.length} ${approvedPending.length === 1 ? 'ordem aprovada aguarda' : 'ordens aprovadas aguardam'} início do reparo`,
        count: approvedPending.length,
        icon: 'bell',
        color: 'blue',
        action: 'Iniciar Reparos',
        link: '/admin/orders?status=approved',
        orders: approvedPending.slice(0, 3),
        dismissible: true,
      });
    }

    // 7. Garantias expirando em 7 dias
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const warrantiesExpiring = (orders || []).filter(o => {
      if (!o.em_garantia || !o.data_fim_garantia) return false;
      const endDate = new Date(o.data_fim_garantia);
      return endDate >= now && endDate <= sevenDaysFromNow;
    });
    if (warrantiesExpiring.length > 0) {
      alerts.push({
        id: 'warranties-expiring',
        type: 'info',
        title: '🛡️ Garantias Expirando',
        description: `${warrantiesExpiring.length} ${warrantiesExpiring.length === 1 ? 'garantia expira' : 'garantias expiram'} em até 7 dias`,
        count: warrantiesExpiring.length,
        icon: 'shield',
        color: 'blue',
        action: 'Ver Garantias',
        link: '/admin/warranty',
        orders: warrantiesExpiring.slice(0, 3),
        dismissible: true,
      });
    }

    // Ordenar alertas por prioridade (urgent > warning > info)
    const priorityOrder = { urgent: 1, warning: 2, info: 3 };
    alerts.sort((a, b) => priorityOrder[a.type as keyof typeof priorityOrder] - priorityOrder[b.type as keyof typeof priorityOrder]);

    return alerts;
  } catch (error) {
    handleApiError(error, 'getDashboardAlerts');
    return [];
  }
}

// ============================================
// CLIENT PROFILE & STATISTICS
// ============================================

/**
 * Obter todas as ordens de um cliente específico
 */
export async function getClientOrders(clientId: string): Promise<ServiceOrderWithClient[]> {
  const { data, error } = await supabase
    .from('service_orders')
    .select(`
      *,
      client:profiles!service_orders_client_id_fkey(*)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) handleApiError(error, 'getClientOrders');
  return Array.isArray(data) ? data : [];
}

/**
 * Obter estatísticas de um cliente específico
 */
export async function getClientStats(clientId: string) {
  try {
    // Buscar todas as ordens do cliente
    const orders = await getClientOrders(clientId);

    // Calcular estatísticas
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'ready_for_pickup').length;
    const inProgressOrders = orders.filter(o => 
      o.status === 'analyzing' || 
      o.status === 'in_repair' || 
      o.status === 'awaiting_parts'
    ).length;
    const awaitingApprovalOrders = orders.filter(o => o.status === 'awaiting_approval').length;

    // Calcular receita total (ordens concluídas ou prontas para retirada com valor)
    // Inclui ordens com status completed ou ready_for_pickup que tenham total_cost
    const revenueOrders = orders.filter(o => 
      (o.status === 'completed' || o.status === 'ready_for_pickup') && 
      o.total_cost && 
      Number(o.total_cost) > 0
    );
    const totalRevenue = revenueOrders.reduce((sum, order) => {
      const total = Number(order.total_cost) || 0;
      return sum + total;
    }, 0);

    // Calcular tempo médio de reparo (em dias)
    const completedWithDates = orders.filter(o => 
      (o.status === 'completed' || o.status === 'ready_for_pickup') && 
      o.created_at && 
      o.data_conclusao
    );
    const avgRepairTime = completedWithDates.length > 0
      ? completedWithDates.reduce((sum, order) => {
          const start = new Date(order.created_at).getTime();
          const end = new Date(order.data_conclusao!).getTime();
          const days = (end - start) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / completedWithDates.length
      : 0;

    // Equipamentos mais comuns
    const equipmentCount: Record<string, number> = {};
    orders.forEach(order => {
      const equipment = order.equipment || 'Não especificado';
      equipmentCount[equipment] = (equipmentCount[equipment] || 0) + 1;
    });
    const mostCommonEquipment = Object.entries(equipmentCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([equipment, count]) => ({ equipment, count }));

    // Última visita
    const lastOrder = orders[0]; // Já ordenado por created_at desc
    const lastVisit = lastOrder ? new Date(lastOrder.created_at) : null;

    // Ordens em garantia
    const ordersInWarranty = orders.filter(o => o.em_garantia).length;

    // Taxa de retorno de garantia
    const warrantyReturns = orders.filter(o => o.retorno_garantia).length;
    const warrantyReturnRate = totalOrders > 0 ? (warrantyReturns / totalOrders) * 100 : 0;

    return {
      totalOrders,
      completedOrders,
      inProgressOrders,
      awaitingApprovalOrders,
      totalRevenue,
      revenueOrdersCount: revenueOrders.length,
      avgRepairTime: Math.round(avgRepairTime * 10) / 10, // Arredondar para 1 casa decimal
      mostCommonEquipment,
      lastVisit,
      ordersInWarranty,
      warrantyReturns,
      warrantyReturnRate: Math.round(warrantyReturnRate * 10) / 10,
    };
  } catch (error) {
    handleApiError(error, 'getClientStats');
  }
}

// =============================================
// AI KNOWLEDGE ENGINE
// =============================================

/**
 * Interface para resposta do Knowledge Engine
 */
export interface AIKnowledgeResponse {
  ok: boolean;
  normalized: {
    keywords: string[];
    terms: string[];
    categories: string[];
    signals_missing: string[];
  };
  knowledge: {
    term_definitions: Array<{
      term: string;
      definition_internal?: string;
      definition_web?: string;
      synonyms?: string[];
      category?: string;
    }>;
    common_causes: string[];
    suggested_checks: string[];
    similar_cases: Array<{
      similarity_score: number;
      description: string;
      solution: string;
      matching_terms: string[];
    }>;
  };
  meta: {
    used_web: boolean;
    fallback_reason: string | null;
    processing_time_ms: number;
  };
}

/**
 * Consulta o Knowledge Engine para obter insights sobre um problema
 * SEMPRE retorna resposta (nunca lança erro)
 */
export async function queryAIKnowledge(params: {
  text: string;
  equipamento_tipo?: string;
  marca?: string;
  modelo?: string;
  context?: {
    os_id?: string;
    mode?: 'OPEN_OS' | 'IN_OS';
  };
}): Promise<AIKnowledgeResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-knowledge-query', {
      body: params,
    });

    if (error) {
      console.error('AI Knowledge Query Error:', error);
      // Return default response on error
      return {
        ok: true,
        normalized: { keywords: [], terms: [], categories: [], signals_missing: [] },
        knowledge: { term_definitions: [], common_causes: [], suggested_checks: [], similar_cases: [] },
        meta: { used_web: false, fallback_reason: 'EDGE_FUNCTION_ERROR', processing_time_ms: 0 },
      };
    }

    return data as AIKnowledgeResponse;
  } catch (error) {
    console.error('AI Knowledge Query Exception:', error);
    // Return default response on exception
    return {
      ok: true,
      normalized: { keywords: [], terms: [], categories: [], signals_missing: [] },
      knowledge: { term_definitions: [], common_causes: [], suggested_checks: [], similar_cases: [] },
      meta: { used_web: false, fallback_reason: 'CLIENT_ERROR', processing_time_ms: 0 },
    };
  }
}

/**
 * Processa eventos de conhecimento pendentes
 * (Função administrativa)
 */
export async function processAIKnowledgeEvents(batchSize: number = 50): Promise<{
  processed_count: number;
  new_terms_count: number;
  errors_count: number;
}> {
  try {
    const { data, error } = await supabase.rpc('process_ai_knowledge_events', {
      batch_size: batchSize,
    });

    if (error) throw error;

    return data[0] || { processed_count: 0, new_terms_count: 0, errors_count: 0 };
  } catch (error) {
    handleApiError(error, 'processAIKnowledgeEvents');
  }
}

/**
 * Constrói cache de casos similares para uma OS
 * (Função administrativa)
 */
export async function buildSimilarCasesCache(osId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('build_similar_cases_cache', {
      target_os_id: osId,
    });

    if (error) throw error;

    return data || 0;
  } catch (error) {
    handleApiError(error, 'buildSimilarCasesCache');
  }
}

/**
 * Obtém estatísticas do Knowledge Engine
 * (Função administrativa)
 */
export async function getAIKnowledgeStats(): Promise<{
  total_events: number;
  pending_events: number;
  total_terms: number;
  total_errors: number;
  last_processed: string | null;
}> {
  try {
    // Get counts from different tables
    const [eventsResult, termsResult, errorsResult] = await Promise.all([
      supabase.from('ai_knowledge_events').select('*', { count: 'exact', head: true }),
      supabase.from('ai_terms').select('*', { count: 'exact', head: true }),
      supabase.from('ai_errors').select('*', { count: 'exact', head: true }).eq('resolved', false),
    ]);

    const pendingResult = await supabase
      .from('ai_knowledge_events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    const lastProcessedResult = await supabase
      .from('ai_knowledge_events')
      .select('processed_at')
      .eq('status', 'PROCESSED')
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      total_events: eventsResult.count || 0,
      pending_events: pendingResult.count || 0,
      total_terms: termsResult.count || 0,
      total_errors: errorsResult.count || 0,
      last_processed: lastProcessedResult.data?.processed_at || null,
    };
  } catch (error) {
    handleApiError(error, 'getAIKnowledgeStats');
  }
}

/**
 * Obtém configuração do AI
 */
export async function getAIConfig(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ai_config')
      .select('config_value')
      .eq('config_key', key)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data?.config_value || null;
  } catch (error) {
    console.error('Error getting AI config:', error);
    return null;
  }
}

/**
 * Atualiza configuração do AI
 * (Função administrativa)
 */
export async function updateAIConfig(key: string, value: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_config')
      .update({ config_value: value, updated_at: new Date().toISOString() })
      .eq('config_key', key);

    if (error) throw error;
  } catch (error) {
    handleApiError(error, 'updateAIConfig');
  }
}

/**
 * Converte eventos de conhecimento processados em casos documentados
 */
export async function convertKnowledgeEventsToCases(
  eventIds?: string[],
  autoApprove: boolean = true
): Promise<{
  cases_created: number;
  events_converted: string[];
}> {
  try {
    const { data, error } = await supabase.rpc('convert_knowledge_events_to_documented_cases', {
      event_ids: eventIds || null,
      auto_approve: autoApprove,
    });

    if (error) throw error;

    return data[0] || { cases_created: 0, events_converted: [] };
  } catch (error) {
    handleApiError(error, 'convertKnowledgeEventsToCases');
  }
}

/**
 * Documented Cases API Functions
 */

// Create a new documented case
export async function createDocumentedCase(caseData: import('@/types/types').DocumentedCaseInput): Promise<import('@/types/types').DocumentedCase> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('ai_documented_cases')
      .insert({
        ...caseData,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'createDocumentedCase');
  }
}

// Update a documented case
export async function updateDocumentedCase(id: string, updates: Partial<import('@/types/types').DocumentedCaseInput>): Promise<import('@/types/types').DocumentedCase> {
  try {
    const { data, error } = await supabase
      .from('ai_documented_cases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'updateDocumentedCase');
  }
}

// Delete (soft delete) a documented case
export async function deleteDocumentedCase(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_documented_cases')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    handleApiError(error, 'deleteDocumentedCase');
  }
}

// Get a single documented case
export async function getDocumentedCase(id: string): Promise<import('@/types/types').DocumentedCase | null> {
  try {
    const { data, error } = await supabase
      .from('ai_documented_cases')
      .select(`
        *,
        creator:profiles!created_by(name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    
    if (data) {
      // Increment view count
      await supabase.rpc('increment_case_view', { case_id: id });
      
      return {
        ...data,
        creator_name: data.creator?.name || null,
      };
    }
    
    return null;
  } catch (error) {
    handleApiError(error, 'getDocumentedCase');
  }
}

// Search documented cases
export async function searchDocumentedCases(params: {
  search?: string;
  equipment?: string;
  brand?: string;
  difficulty?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<import('@/types/types').DocumentedCase[]> {
  try {
    const { data, error } = await supabase.rpc('search_documented_cases', {
      search_query: params.search || null,
      equipment_filter: params.equipment || null,
      brand_filter: params.brand || null,
      difficulty_filter: params.difficulty || null,
      tag_filter: params.tag || null,
      limit_count: params.limit || 50,
      offset_count: params.offset || 0,
    });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    handleApiError(error, 'searchDocumentedCases');
  }
}

// Get equipment suggestions for autocomplete
export async function getEquipmentSuggestions(searchTerm: string): Promise<Array<{ equipment_type: string; count: number }>> {
  try {
    const { data, error } = await supabase.rpc('get_equipment_suggestions', {
      search_term: searchTerm,
      limit_count: 10,
    });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error getting equipment suggestions:', error);
    return [];
  }
}

// Get brand suggestions for autocomplete
export async function getBrandSuggestions(searchTerm: string): Promise<Array<{ brand: string; count: number }>> {
  try {
    const { data, error } = await supabase.rpc('get_brand_suggestions', {
      search_term: searchTerm,
      limit_count: 10,
    });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error getting brand suggestions:', error);
    return [];
  }
}

// Get tag suggestions for autocomplete
export async function getTagSuggestions(searchTerm: string): Promise<Array<{ tag: string; count: number }>> {
  try {
    const { data, error } = await supabase.rpc('get_tag_suggestions', {
      search_term: searchTerm,
      limit_count: 20,
    });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error getting tag suggestions:', error);
    return [];
  }
}

// Mark case as helpful
export async function markCaseHelpful(caseId: string): Promise<void> {
  try {
    await supabase.rpc('mark_case_helpful', { case_id: caseId });
  } catch (error) {
    console.error('Error marking case as helpful:', error);
  }
}

// Increment view count for a case
export async function incrementCaseViewCount(caseId: string): Promise<void> {
  try {
    await supabase.rpc('increment_case_view_count', { case_id: caseId });
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
}

// Get knowledge contribution statistics
export async function getKnowledgeContributionStats(): Promise<import('@/types/types').KnowledgeContributionStats> {
  try {
    const { data, error } = await supabase.rpc('get_knowledge_contribution_stats');

    if (error) throw error;
    
    const result = Array.isArray(data) ? data[0] : data;
    
    return {
      total_cases: result?.total_cases || 0,
      total_contributors: result?.total_contributors || 0,
      total_views: result?.total_views || 0,
      total_helpful: result?.total_helpful || 0,
      avg_time_minutes: result?.avg_time_minutes || 0,
      top_contributors: result?.top_contributors || [],
    };
  } catch (error) {
    handleApiError(error, 'getKnowledgeContributionStats');
  }
}

// ============================================
// PUBLIC ORDER TRACKING (sem autenticação)
// ============================================

/**
 * Rastrear OS por número (público, sem login)
 * Retorna dados sanitizados da ordem de serviço
 */
export async function trackOrderByNumber(orderNumber: string): Promise<any> {
  try {
    if (!orderNumber || orderNumber.trim() === '') {
      throw new Error('Número da OS é obrigatório');
    }

    const { data, error } = await supabase
      .rpc('track_order_by_number', { p_order_number: orderNumber.trim() });

    if (error) {
      console.error('Erro ao rastrear OS por número:', error);
      throw new Error('Erro ao buscar ordem de serviço');
    }

    if (!data || data.length === 0) {
      return null; // OS não encontrada
    }

    return data[0]; // Retorna primeira (e única) OS encontrada
  } catch (error) {
    handleApiError(error, 'trackOrderByNumber');
  }
}

/**
 * Rastrear OS por email (público, sem login)
 * Retorna lista de OS do cliente
 */
export async function trackOrdersByEmail(email: string): Promise<any[]> {
  try {
    if (!email || email.trim() === '') {
      throw new Error('E-mail é obrigatório');
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('E-mail inválido');
    }

    const { data, error } = await supabase
      .rpc('track_orders_by_email', { p_email: email.trim().toLowerCase() });

    if (error) {
      console.error('Erro ao rastrear OS por email:', error);
      throw new Error('Erro ao buscar ordens de serviço');
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    handleApiError(error, 'trackOrdersByEmail');
  }
}

/**
 * Rastrear OS por telefone (público, sem login)
 * Retorna lista de OS do cliente
 */
export async function trackOrdersByPhone(phone: string): Promise<any[]> {
  try {
    if (!phone || phone.trim() === '') {
      throw new Error('Telefone é obrigatório');
    }

    // Remove caracteres não numéricos para validação
    const phoneDigits = phone.replace(/\D/g, '');
    
    // Validação básica: deve ter pelo menos 10 dígitos (DDD + número)
    if (phoneDigits.length < 10) {
      throw new Error('Telefone inválido. Informe DDD + número');
    }

    const { data, error } = await supabase
      .rpc('track_orders_by_phone', { p_phone: phone.trim() });

    if (error) {
      console.error('Erro ao rastrear OS por telefone:', error);
      throw new Error('Erro ao buscar ordens de serviço');
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    handleApiError(error, 'trackOrdersByPhone');
  }
}

/**
 * Buscar histórico de status de uma OS (público)
 * Para exibir timeline na consulta pública
 */
export async function getPublicOrderStatusHistory(orderId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('order_status_history')
      .select(`
        id,
        status,
        notes,
        created_at,
        created_by,
        profiles:created_by (
          name,
          email
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar histórico de status:', error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Erro ao buscar histórico público:', error);
    return [];
  }
}
