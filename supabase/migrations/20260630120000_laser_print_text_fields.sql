ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS laser_print_text TEXT,
  ADD COLUMN IF NOT EXISTS laser_print_font TEXT,
  ADD COLUMN IF NOT EXISTS laser_print_note TEXT;

COMMENT ON COLUMN public.order_items.laser_print_text IS 'Customer word to laser-print';
COMMENT ON COLUMN public.order_items.laser_print_font IS 'Instagram Story font name (e.g. Modern, Poster)';
COMMENT ON COLUMN public.order_items.laser_print_note IS 'Extra note accompanying uploaded laser image';
