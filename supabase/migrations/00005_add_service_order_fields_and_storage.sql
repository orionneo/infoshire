-- Add new fields to service_orders table
ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS equipment_photo_url TEXT;

-- Create storage bucket for equipment photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-8pj0bpgfx6v5_equipment_photos',
  'app-8pj0bpgfx6v5_equipment_photos',
  true,
  1048576, -- 1MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for equipment photos bucket
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload equipment photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-8pj0bpgfx6v5_equipment_photos');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update equipment photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'app-8pj0bpgfx6v5_equipment_photos');

-- Allow public read access so clients can view photos
CREATE POLICY "Public can view equipment photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'app-8pj0bpgfx6v5_equipment_photos');

-- Allow admins to delete photos
CREATE POLICY "Admins can delete equipment photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'app-8pj0bpgfx6v5_equipment_photos' 
  AND auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);