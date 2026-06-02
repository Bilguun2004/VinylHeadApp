-- Admin broadcast notifications + customer Expo push tokens (idempotent).

CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'deals'
    CHECK (category IN ('deals', 'news', 'orders', 'general')),
  image_url text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broadcast_notifications_sent_at_idx
  ON public.broadcast_notifications (sent_at DESC);

ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS broadcast_notifications_admin_all ON public.broadcast_notifications;
CREATE POLICY broadcast_notifications_admin_all
  ON public.broadcast_notifications
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS broadcast_notifications_customer_read ON public.broadcast_notifications;
CREATE POLICY broadcast_notifications_customer_read
  ON public.broadcast_notifications
  FOR SELECT
  TO authenticated
  USING (NOT public.is_admin());

CREATE TABLE IF NOT EXISTS public.expo_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS expo_push_tokens_user_id_idx ON public.expo_push_tokens (user_id);

ALTER TABLE public.expo_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expo_push_tokens_own_upsert ON public.expo_push_tokens;
CREATE POLICY expo_push_tokens_own_upsert
  ON public.expo_push_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS expo_push_tokens_admin_read ON public.expo_push_tokens;
CREATE POLICY expo_push_tokens_admin_read
  ON public.expo_push_tokens
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
