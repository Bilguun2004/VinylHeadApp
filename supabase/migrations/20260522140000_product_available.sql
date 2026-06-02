-- Replace stock_quantity with boolean availability flag
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS available BOOLEAN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'stock_quantity'
  ) THEN
    UPDATE public.products
    SET available = (stock_quantity > 0)
    WHERE available IS NULL;
  ELSE
    UPDATE public.products
    SET available = true
    WHERE available IS NULL;
  END IF;
END;
$$;

ALTER TABLE public.products
  ALTER COLUMN available SET DEFAULT true,
  ALTER COLUMN available SET NOT NULL;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS stock_quantity;
