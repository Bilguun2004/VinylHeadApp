-- ===== migration: 20260513180000_initial_ecommerce_schema.sql =====
-- PyanZ Tolgoit — initial ecommerce schema (aligned with Stitch design)
-- Apply in Supabase SQL Editor or via: supabase db push (linked project)

-- ---------------------------------------------------------------------------
-- Admin helper: use app_metadata only (not user_metadata)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- ---------------------------------------------------------------------------
-- Tables (dependency order)
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  artist TEXT,
  description TEXT,
  price NUMERIC NOT NULL,
  discount_price NUMERIC,
  image_url TEXT,
  specs JSONB,
  is_laser_printing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.gift_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  phone_number TEXT UNIQUE,
  delivery_address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Confirmed',
  payment_method TEXT,
  subtotal NUMERIC NOT NULL,
  delivery_fee NUMERIC NOT NULL DEFAULT 5000,
  gift_wrap_total NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  delivery_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products (id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  gift_option_id UUID REFERENCES public.gift_options (id),
  laser_print_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX products_category_id_idx ON public.products (category_id);
CREATE INDEX orders_user_id_created_at_idx ON public.orders (user_id, created_at DESC);
CREATE INDEX order_items_order_id_idx ON public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Categories: public read, admin write
CREATE POLICY categories_select_public
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY categories_admin_all
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Products: public read, admin write
CREATE POLICY products_select_public
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY products_admin_all
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Gift options: public read, admin write
CREATE POLICY gift_options_select_public
  ON public.gift_options FOR SELECT
  USING (true);

CREATE POLICY gift_options_admin_all
  ON public.gift_options FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Profiles: users manage own row; admins read all
CREATE POLICY profiles_own_all
  ON public.profiles FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_admin_select
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Orders: users read/insert own; admins full access
CREATE POLICY orders_own_select
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY orders_own_insert
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY orders_admin_all
  ON public.orders FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Order items: users read items for own orders; insert when parent is own
CREATE POLICY order_items_own_select
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY order_items_own_insert
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY order_items_admin_all
  ON public.order_items FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===== migration: 20260514120000_product_images_storage.sql =====
-- Public bucket for product cover images (admin uploads from the app).
-- RLS: anyone can read; only JWT app_metadata.role = 'admin' can write.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS product_images_public_read ON storage.objects;
DROP POLICY IF EXISTS product_images_admin_insert ON storage.objects;
DROP POLICY IF EXISTS product_images_admin_update ON storage.objects;
DROP POLICY IF EXISTS product_images_admin_delete ON storage.objects;

CREATE POLICY product_images_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY product_images_admin_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  );

CREATE POLICY product_images_admin_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  );

CREATE POLICY product_images_admin_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  );

-- ===== migration: 20260522120000_category_sort_order.sql =====
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

-- ===== migration: 20260522140000_product_available.sql =====
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

-- ===== migration: 20260522160000_product_options.sql =====
-- Product variant/color options (admin toggle + JSON list)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS options_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS options_label TEXT,
  ADD COLUMN IF NOT EXISTS product_options JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ===== migration: 20260525120000_broadcast_notifications.sql =====
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

-- ===== migration: 20260526120000_order_uploads_storage.sql =====
-- Customer uploads for order laser-print images (authenticated users, own folder only).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-uploads',
  'order-uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS order_uploads_public_read ON storage.objects;
DROP POLICY IF EXISTS order_uploads_customer_insert ON storage.objects;
DROP POLICY IF EXISTS order_uploads_customer_update ON storage.objects;
DROP POLICY IF EXISTS order_uploads_admin_all ON storage.objects;

CREATE POLICY order_uploads_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-uploads');

CREATE POLICY order_uploads_customer_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'order-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY order_uploads_customer_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'order-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'order-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY order_uploads_admin_all
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'order-uploads'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'order-uploads'
    AND public.is_admin()
  );

-- ===== migration: 20260527120000_sub_categories.sql =====
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

-- ===== migration: 20260528130000_chat_threads_and_messages.sql =====
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

-- ===== migration: 20260528130500_chat_uploads_storage.sql =====
-- Chat uploads (authenticated users, own folder only; admins full access).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-uploads',
  'chat-uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS chat_uploads_public_read ON storage.objects;
DROP POLICY IF EXISTS chat_uploads_user_insert ON storage.objects;
DROP POLICY IF EXISTS chat_uploads_user_update ON storage.objects;
DROP POLICY IF EXISTS chat_uploads_admin_all ON storage.objects;

CREATE POLICY chat_uploads_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-uploads');

CREATE POLICY chat_uploads_user_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY chat_uploads_user_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY chat_uploads_admin_all
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'chat-uploads'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND public.is_admin()
  );

-- ===== migration: 20260528193500_handle_new_user_profile.sql =====
-- Create a profile row for every new auth user.
-- This prevents FK errors when app features reference public.profiles (e.g. chat_threads.user_id).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (
    NEW.id,
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'display_name', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'phone_number', '')), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ===== migration: 20260528194000_profile_avatars_storage.sql =====
-- Profile avatars (authenticated users, own folder only; admins full access).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS profile_avatars_public_read ON storage.objects;
DROP POLICY IF EXISTS profile_avatars_user_insert ON storage.objects;
DROP POLICY IF EXISTS profile_avatars_user_update ON storage.objects;
DROP POLICY IF EXISTS profile_avatars_admin_all ON storage.objects;

CREATE POLICY profile_avatars_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-avatars');

CREATE POLICY profile_avatars_user_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY profile_avatars_user_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY profile_avatars_admin_all
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND public.is_admin()
  );

-- ===== migration: 20260529120000_product_reviews.sql =====
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

-- ===== migration: 20260529140000_product_reviews_avatar.sql =====
-- Review author avatars: snapshot column + public read for reviewers' profiles.

ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;

-- Allow reading avatar_url (and name) for users who have posted reviews.
DROP POLICY IF EXISTS profiles_select_review_authors ON public.profiles;
CREATE POLICY profiles_select_review_authors
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.product_reviews r
      WHERE r.user_id = profiles.id
    )
  );

-- ===== migration: 20260602120000_product_featured.sql =====
-- Featured products: admin can pin items to the top of their category in the shop.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_category_featured_idx
  ON public.products (category_id, is_featured DESC, created_at DESC);

-- ===== migration: 20260605120000_check_signup_identity_available.sql =====
-- Pre-signup identity check (email in auth.users, phone in public.profiles).
-- Callable by anon so the app can block duplicate registrations before auth.signUp.

CREATE OR REPLACE FUNCTION public.check_signup_identity_available(
  p_email text,
  p_phone_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_phone text := nullif(btrim(COALESCE(p_phone_number, '')), '');
  v_email_taken boolean := false;
  v_phone_taken boolean := false;
BEGIN
  IF v_email <> '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM auth.users
      WHERE lower(email) = v_email
    )
    INTO v_email_taken;
  END IF;

  IF v_phone IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE phone_number = v_phone
    )
    INTO v_phone_taken;
  END IF;

  RETURN jsonb_build_object(
    'email_taken', v_email_taken,
    'phone_taken', v_phone_taken
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_signup_identity_available(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_signup_identity_available(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_signup_identity_available(text, text) TO authenticated;

-- Belt-and-suspenders: reject profile creation when phone is already taken so a
-- duplicate auth user cannot be left behind if the client check is bypassed.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := nullif(
    btrim(COALESCE(NEW.raw_user_meta_data ->> 'phone_number', '')),
    ''
  );
BEGIN
  IF v_phone IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE phone_number = v_phone
  ) THEN
    RAISE EXCEPTION 'phone_number_already_registered'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (
    NEW.id,
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'display_name', '')), ''),
    v_phone
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ===== migration: 20260623120000_apple_auth_profile.sql =====
-- Sign in with Apple: accept full_name metadata, tolerate hidden / relay emails.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := nullif(
    btrim(COALESCE(NEW.raw_user_meta_data ->> 'phone_number', '')),
    ''
  );
  v_display_name text := nullif(
    btrim(
      COALESCE(
        NEW.raw_user_meta_data ->> 'display_name',
        NEW.raw_user_meta_data ->> 'full_name',
        ''
      )
    ),
    ''
  );
BEGIN
  IF v_phone IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE phone_number = v_phone
  ) THEN
    RAISE EXCEPTION 'phone_number_already_registered'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (NEW.id, v_display_name, v_phone)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ===== migration: 20260630120000_laser_print_text_fields.sql =====
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS laser_print_text TEXT,
  ADD COLUMN IF NOT EXISTS laser_print_font TEXT,
  ADD COLUMN IF NOT EXISTS laser_print_note TEXT;

COMMENT ON COLUMN public.order_items.laser_print_text IS 'Customer word to laser-print';
COMMENT ON COLUMN public.order_items.laser_print_font IS 'Instagram Story font name (e.g. Modern, Poster)';
COMMENT ON COLUMN public.order_items.laser_print_note IS 'Extra note accompanying uploaded laser image';

-- ===== migration: 20260708120000_bonum_payment_fields.sql =====
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS bonum_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS bonum_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.payment_status IS
  'unpaid | pending | paid | failed — Bonum/QPay lifecycle';
COMMENT ON COLUMN public.orders.bonum_invoice_id IS
  'Bonum Gateway invoice id from createInvoice';
COMMENT ON COLUMN public.orders.bonum_transaction_id IS
  'Merchant transactionId sent to Bonum (usually orders.id)';
COMMENT ON COLUMN public.orders.paid_at IS
  'Set when Bonum webhook confirms successful payment';

CREATE INDEX IF NOT EXISTS orders_bonum_transaction_id_idx
  ON public.orders (bonum_transaction_id)
  WHERE bonum_transaction_id IS NOT NULL;

-- ===== migration: 20260708130000_bonum_auth_token_cache.sql =====
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

-- ===== seed: seed.sql =====

