-- Product variant/color options (admin toggle + JSON list)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS options_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS options_label TEXT,
  ADD COLUMN IF NOT EXISTS product_options JSONB NOT NULL DEFAULT '[]'::jsonb;
