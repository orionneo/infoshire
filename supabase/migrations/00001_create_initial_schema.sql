-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('client', 'admin');

-- Create order status enum
CREATE TYPE public.order_status AS ENUM (
  'received',
  'analyzing',
  'awaiting_approval',
  'in_repair',
  'awaiting_parts',
  'completed',
  'ready_for_pickup'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'client'::public.user_role,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create service_orders table
CREATE TABLE public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  equipment text NOT NULL,
  problem_description text NOT NULL,
  status public.order_status NOT NULL DEFAULT 'received'::public.order_status,
  estimated_completion timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create order_status_history table
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.service_orders(id) ON DELETE CASCADE NOT NULL,
  status public.order_status NOT NULL,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.service_orders(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create site_settings table
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role = 'admin'::public.user_role
  );
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'client'::public.user_role END
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Service orders policies
CREATE POLICY "Admins have full access to service_orders" ON public.service_orders
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view their own orders" ON public.service_orders
  FOR SELECT TO authenticated USING (client_id = auth.uid());

-- Order status history policies
CREATE POLICY "Admins have full access to order_status_history" ON public.order_status_history
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view history of their orders" ON public.order_status_history
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = order_id AND so.client_id = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Admins have full access to messages" ON public.messages
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view messages of their orders" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = order_id AND so.client_id = auth.uid()
    )
  );

CREATE POLICY "Clients can send messages to their orders" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = order_id AND so.client_id = auth.uid()
    )
  );

-- Site settings policies
CREATE POLICY "Everyone can view site_settings" ON public.site_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage site_settings" ON public.site_settings
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-8pj0bpgfx6v5_messages_images', 'app-8pj0bpgfx6v5_messages_images', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'app-8pj0bpgfx6v5_messages_images');

CREATE POLICY "Public can view images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'app-8pj0bpgfx6v5_messages_images');

-- Insert default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', '"TechFix - Assistência Técnica"'::jsonb),
  ('site_logo', '""'::jsonb),
  ('primary_color', '"#2563eb"'::jsonb),
  ('home_hero_title', '"Assistência Técnica Especializada"'::jsonb),
  ('home_hero_subtitle', '"Reparo de eletrônicos, computadores, notebooks e celulares com qualidade e transparência"'::jsonb),
  ('about_content', '"Somos uma assistência técnica especializada em eletrônicos com anos de experiência no mercado."'::jsonb),
  ('contact_email', '"contato@techfix.com"'::jsonb),
  ('contact_phone', '"(11) 99999-9999"'::jsonb),
  ('contact_address', '"Rua Exemplo, 123 - São Paulo, SP"'::jsonb);

-- Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_number text;
  year_prefix text;
  sequence_num int;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM public.service_orders
  WHERE order_number LIKE year_prefix || '%';
  
  new_number := year_prefix || LPAD(sequence_num::text, 6, '0');
  
  RETURN new_number;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_service_orders_client_id ON public.service_orders(client_id);
CREATE INDEX idx_service_orders_status ON public.service_orders(status);
CREATE INDEX idx_service_orders_created_at ON public.service_orders(created_at DESC);
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_messages_order_id ON public.messages(order_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);