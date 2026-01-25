-- Create order_images table for equipment photos
CREATE TABLE IF NOT EXISTS order_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_order_images_order_id ON order_images(order_id);
CREATE INDEX idx_order_images_created_at ON order_images(created_at DESC);

-- RLS Policies for order_images
ALTER TABLE order_images ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to order images" ON order_images
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Clients can view images from their own orders
CREATE POLICY "Clients can view their order images" ON order_images
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM service_orders
      WHERE service_orders.id = order_images.order_id
      AND service_orders.client_id = auth.uid()
    )
  );

-- Create storage bucket for order images
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-8pj0bpgfx6v5_order_images', 'app-8pj0bpgfx6v5_order_images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Admins can upload
CREATE POLICY "Admins can upload order images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'app-8pj0bpgfx6v5_order_images'
  AND is_admin(auth.uid())
);

-- Storage policies: Admins can update
CREATE POLICY "Admins can update order images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'app-8pj0bpgfx6v5_order_images'
  AND is_admin(auth.uid())
);

-- Storage policies: Admins can delete
CREATE POLICY "Admins can delete order images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'app-8pj0bpgfx6v5_order_images'
  AND is_admin(auth.uid())
);

-- Storage policies: Authenticated users can view images from their orders
CREATE POLICY "Users can view order images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'app-8pj0bpgfx6v5_order_images'
  AND (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM order_images oi
      JOIN service_orders so ON so.id = oi.order_id
      WHERE oi.image_url LIKE '%' || name || '%'
      AND (so.client_id = auth.uid() OR is_admin(auth.uid()))
    )
  )
);