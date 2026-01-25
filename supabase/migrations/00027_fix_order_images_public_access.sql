-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view order images" ON storage.objects;

-- Create a new public SELECT policy for order images
CREATE POLICY "Public can view order images"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'app-8pj0bpgfx6v5_order_images'
);