-- Category display order (admin drag-and-drop, customer home nav)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) - 1 AS rn
  FROM public.categories
)
UPDATE public.categories c
SET sort_order = n.rn
FROM numbered n
WHERE c.id = n.id;
