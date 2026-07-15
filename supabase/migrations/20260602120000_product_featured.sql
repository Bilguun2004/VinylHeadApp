-- Featured products: admin can pin items to the top of their category in the shop.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_category_featured_idx
  ON public.products (category_id, is_featured DESC, created_at DESC);
