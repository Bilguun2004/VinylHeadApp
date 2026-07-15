ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bonum_follow_up_link TEXT;

COMMENT ON COLUMN public.orders.bonum_follow_up_link IS
  'Bonum payment page URL from createInvoice (followUpLink)';

CREATE TABLE IF NOT EXISTS public.bonum_auth_tokens (
  terminal_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bonum_auth_tokens IS
  'Cached Bonum Gateway access/refresh tokens (service role only)';

ALTER TABLE public.bonum_auth_tokens ENABLE ROW LEVEL SECURITY;
