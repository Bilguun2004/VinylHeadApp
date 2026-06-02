-- Customer uploads for order laser-print images (authenticated users, own folder only).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-uploads',
  'order-uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS order_uploads_public_read ON storage.objects;
DROP POLICY IF EXISTS order_uploads_customer_insert ON storage.objects;
DROP POLICY IF EXISTS order_uploads_customer_update ON storage.objects;
DROP POLICY IF EXISTS order_uploads_admin_all ON storage.objects;

CREATE POLICY order_uploads_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-uploads');

CREATE POLICY order_uploads_customer_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'order-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY order_uploads_customer_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'order-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'order-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY order_uploads_admin_all
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'order-uploads'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'order-uploads'
    AND public.is_admin()
  );
