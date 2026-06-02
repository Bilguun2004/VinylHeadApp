-- Chat uploads (authenticated users, own folder only; admins full access).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-uploads',
  'chat-uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS chat_uploads_public_read ON storage.objects;
DROP POLICY IF EXISTS chat_uploads_user_insert ON storage.objects;
DROP POLICY IF EXISTS chat_uploads_user_update ON storage.objects;
DROP POLICY IF EXISTS chat_uploads_admin_all ON storage.objects;

CREATE POLICY chat_uploads_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-uploads');

CREATE POLICY chat_uploads_user_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY chat_uploads_user_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY chat_uploads_admin_all
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'chat-uploads'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND public.is_admin()
  );

