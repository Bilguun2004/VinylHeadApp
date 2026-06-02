-- Product reviews, images, likes, and review-images storage.

-- ---------------------------------------------------------------------------
-- Helper: user purchased product with delivered order
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_delivered_product(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = p_product_id
      AND o.user_id = auth.uid()
      AND lower(trim(o.status)) IN ('delivered', 'хүргэгдсэн')
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_delivered_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_delivered_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_delivered_product(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  author_display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);

CREATE TABLE public.product_review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.product_reviews (id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.product_review_likes (
  review_id UUID NOT NULL REFERENCES public.product_reviews (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

CREATE INDEX product_reviews_product_id_created_at_idx
  ON public.product_reviews (product_id, created_at DESC);

CREATE INDEX product_review_images_review_id_idx
  ON public.product_review_images (review_id);

CREATE INDEX product_review_likes_review_id_idx
  ON public.product_review_likes (review_id);

CREATE TRIGGER product_reviews_set_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_review_likes ENABLE ROW LEVEL SECURITY;

-- Reviews
CREATE POLICY product_reviews_select_public
  ON public.product_reviews FOR SELECT
  USING (true);

CREATE POLICY product_reviews_insert_own_delivered
  ON public.product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_has_delivered_product(product_id)
  );

CREATE POLICY product_reviews_delete_own
  ON public.product_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY product_reviews_admin_all
  ON public.product_reviews FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Review images
CREATE POLICY product_review_images_select_public
  ON public.product_review_images FOR SELECT
  USING (true);

CREATE POLICY product_review_images_insert_own_review
  ON public.product_review_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.product_reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY product_review_images_delete_own_review
  ON public.product_review_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.product_reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY product_review_images_admin_all
  ON public.product_review_images FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Review likes
CREATE POLICY product_review_likes_select_public
  ON public.product_review_likes FOR SELECT
  USING (true);

CREATE POLICY product_review_likes_insert_own
  ON public.product_review_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.product_reviews r WHERE r.id = review_id)
  );

CREATE POLICY product_review_likes_delete_own
  ON public.product_review_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY product_review_likes_admin_all
  ON public.product_review_likes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: review-images
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS review_images_public_read ON storage.objects;
DROP POLICY IF EXISTS review_images_user_insert ON storage.objects;
DROP POLICY IF EXISTS review_images_user_update ON storage.objects;
DROP POLICY IF EXISTS review_images_admin_all ON storage.objects;

CREATE POLICY review_images_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-images');

CREATE POLICY review_images_user_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY review_images_user_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY review_images_admin_all
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'review-images'
    AND public.is_admin()
  );
