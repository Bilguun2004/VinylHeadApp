-- Profile avatars (authenticated users, own folder only; admins full access).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS profile_avatars_public_read ON storage.objects;
DROP POLICY IF EXISTS profile_avatars_user_insert ON storage.objects;
DROP POLICY IF EXISTS profile_avatars_user_update ON storage.objects;
DROP POLICY IF EXISTS profile_avatars_admin_all ON storage.objects;

CREATE POLICY profile_avatars_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-avatars');

CREATE POLICY profile_avatars_user_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY profile_avatars_user_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY profile_avatars_admin_all
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND public.is_admin()
  );
