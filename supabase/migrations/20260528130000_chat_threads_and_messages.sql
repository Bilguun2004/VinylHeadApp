-- User ↔ Admin chat (single thread per user).
-- Includes RLS + helper trigger to maintain thread last-message fields.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  is_follow_up boolean NOT NULL DEFAULT false,
  last_message_at timestamptz,
  last_message_preview text,
  user_last_read_at timestamptz,
  admin_last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS chat_threads_last_message_at_idx
  ON public.chat_threads (last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS chat_threads_follow_up_last_message_at_idx
  ON public.chat_threads (is_follow_up, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads (id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('user', 'admin')),
  text text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_message_has_content CHECK (text IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_id_created_at_idx
  ON public.chat_messages (thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx
  ON public.chat_messages (created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger (reuses public.update_updated_at_column from initial schema)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS chat_threads_set_updated_at ON public.chat_threads;
CREATE TRIGGER chat_threads_set_updated_at
  BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Thread maintenance trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_apply_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  preview text;
BEGIN
  preview := NULL;
  IF NEW.text IS NOT NULL AND length(btrim(NEW.text)) > 0 THEN
    preview := left(btrim(NEW.text), 120);
  ELSIF NEW.image_url IS NOT NULL THEN
    preview := 'Зураг';
  END IF;

  UPDATE public.chat_threads
    SET last_message_at = NEW.created_at,
        last_message_preview = preview,
        updated_at = now()
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.chat_apply_last_message() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_apply_last_message() TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_apply_last_message() TO service_role;

DROP TRIGGER IF EXISTS chat_messages_apply_last_message ON public.chat_messages;
CREATE TRIGGER chat_messages_apply_last_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_apply_last_message();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Threads: user owns one thread; admin can manage all.
DROP POLICY IF EXISTS chat_threads_user_select ON public.chat_threads;
CREATE POLICY chat_threads_user_select
  ON public.chat_threads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS chat_threads_user_insert ON public.chat_threads;
CREATE POLICY chat_threads_user_insert
  ON public.chat_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS chat_threads_user_update ON public.chat_threads;
CREATE POLICY chat_threads_user_update
  ON public.chat_threads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Messages: users can read their thread; users can only insert as 'user'. Admins can read/insert all.
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
CREATE POLICY chat_messages_select
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_messages_user_insert ON public.chat_messages;
CREATE POLICY chat_messages_user_insert
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'user'
    AND sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_messages_admin_insert ON public.chat_messages;
CREATE POLICY chat_messages_admin_insert
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    AND sender_role = 'admin'
    AND sender_user_id = auth.uid()
  );

