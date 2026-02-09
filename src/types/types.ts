export type UserRole = 'client' | 'admin';

export type OrderStatus = 
  | 'received'
  | 'analyzing'
  | 'awaiting_approval'
  | 'approved'
  | 'not_approved'
  | 'in_repair'
  | 'awaiting_parts'
  | 'completed'
  | 'ready_for_pickup';

export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: UserRole;
  password_changed: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceOrder = {
  id: string;
  order_number: string;
  client_id: string;
  equipment: string;
  serial_number: string | null;
  entry_date: string | null;
  equipment_photo_url: string | null;
  problem_description: string;
  status: OrderStatus;
  estimated_completion: string | null;
  completed_at: string | null;
  labor_cost: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  budget_approved: boolean;
  approved_at: string | null;
  approval_token: string | null;
  budget_notes: string | null;
  has_multiple_items: boolean;
  discount_amount: number | null;
  discount_reason: string | null;
  data_conclusao: string | null;
  data_retirada: string | null;
  data_fim_garantia: string | null;
  em_garantia: boolean;
  retorno_garantia: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceOrderItem = {
  id: string;
  service_order_id: string;
  equipment: string;
  serial_number: string | null;
  description: string | null;
  created_at: string;
};

export type ServiceOrderWithClient = ServiceOrder & {
  client: Profile;
  items?: ServiceOrderItem[];
};

// Public Order Tracking Types (dados sanitizados para consulta pública)
export type PublicOrderInfo = {
  id: string;
  order_number: string;
  equipment: string;
  problem_description: string;
  status: OrderStatus;
  entry_date: string | null;
  estimated_completion: string | null;
  completed_at: string | null;
  created_at: string;
  em_garantia: boolean;
  data_fim_garantia: string | null;
  client_name: string;
  client_email_masked?: string;
  client_phone_masked?: string;
};

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type OrderStatusHistoryWithUser = OrderStatusHistory & {
  creator: Profile | null;
};

export type ApprovalHistory = {
  id: string;
  order_id: string;
  labor_cost: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  subtotal_cost: number | null;
  discount_amount: number | null;
  discount_reason: string | null;
  total_final_cost: number | null;
  approved_at: string;
  client_ip: string | null;
  notes: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

export type MessageWithSender = Message & {
  sender: Profile;
};

export type OrderImage = {
  id: string;
  order_id: string;
  image_url: string;
  description: string | null;
  uploaded_by: string;
  created_at: string;
};

export type OrderImageWithUploader = OrderImage & {
  uploader: Profile;
};

export type SiteSetting = {
  id: string;
  key: string;
  value: any;
  updated_at: string;
};

export type PopupConfig = {
  id: string;
  is_active: boolean;
  title: string;
  description: string | null;
  image_url: string | null;
  button_text: string;
  created_at: string;
  updated_at: string;
};

export type EmailCampaign = {
  id: string;
  subject: string;
  body: string;
  recipients_count: number;
  sent_by: string | null;
  sent_at: string;
  created_at: string;
};

export type EmailCampaignWithSender = EmailCampaign & {
  sender: {
    name: string | null;
    email: string | null;
  } | null;
};

export type EmailConfig = {
  id: string;
  provider: 'smtp' | 'resend';
  smtp_host: string | null;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string | null;
  from_name: string;
  from_email: string | null;
  resend_from_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WarrantySearch = {
  client_id?: string;
  equipment?: string;
  serial_number?: string;
};

export type WarrantyExpiringSoon = {
  id: string;
  order_number: string;
  client_id: string;
  equipment: string;
  serial_number: string | null;
  data_conclusao: string;
  data_fim_garantia: string;
  em_garantia: boolean;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  dias_restantes: number;
};

export type DocumentedCase = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  creator_name?: string | null;
  title: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  problem_description: string;
  solution_description: string;
  tags: string[];
  difficulty_level: 'easy' | 'medium' | 'hard' | null;
  estimated_time_minutes: number | null;
  parts_used: string[] | null;
  estimated_cost: number | null;
  notes: string | null;
  view_count: number;
  helpful_count: number;
  used_in_diagnosis_count: number;
  is_active: boolean;
  is_verified: boolean;
};

export type DocumentedCaseInput = {
  title: string;
  equipment_type: string;
  brand?: string;
  model?: string;
  problem_description: string;
  solution_description: string;
  tags?: string[];
  difficulty_level?: 'easy' | 'medium' | 'hard';
  estimated_time_minutes?: number;
  parts_used?: string[];
  estimated_cost?: number;
  notes?: string;
};

export type KnowledgeContributionStats = {
  total_cases: number;
  total_contributors: number;
  total_views: number;
  total_helpful: number;
  avg_time_minutes: number;
  top_contributors: Array<{
    name: string;
    count: number;
    helpful_total: number;
  }>;
};
