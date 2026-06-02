-- Sub-categories nested under main categories + optional product link.

CREATE TABLE IF NOT EXISTS public.sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sub_categories_category_id_idx
  ON public.sub_categories (category_id);

CREATE INDEX IF NOT EXISTS sub_categories_category_sort_idx
  ON public.sub_categories (category_id, sort_order);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES public.sub_categories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_sub_category_id_idx
  ON public.products (sub_category_id);

DROP TRIGGER IF EXISTS sub_categories_set_updated_at ON public.sub_categories;
CREATE TRIGGER sub_categories_set_updated_at
  BEFORE UPDATE ON public.sub_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sub_categories_select_public ON public.sub_categories;
DROP POLICY IF EXISTS sub_categories_admin_all ON public.sub_categories;

CREATE POLICY sub_categories_select_public
  ON public.sub_categories
  FOR SELECT
  USING (true);

CREATE POLICY sub_categories_admin_all
  ON public.sub_categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
