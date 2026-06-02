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

-- Seed data for VinylHeadApp (run AFTER `20260513180000_initial_ecommerce_schema.sql`)
-- Supabase SQL Editor: paste and run as a single script.

INSERT INTO public.categories (id, name, icon) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Винил', NULL),
  ('11111111-1111-1111-1111-111111111102', 'Пянз тоглуулагч', NULL),
  ('11111111-1111-1111-1111-111111111103', 'Чанга яригч', NULL),
  ('11111111-1111-1111-1111-111111111104', 'Дагалдах хэрэгсэл', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (
  id,
  category_id,
  title,
  artist,
  description,
  price,
  discount_price,
  image_url,
  specs,
  is_laser_printing_enabled,
  stock_quantity
) VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'Discovery (2xLP)',
    'Daft Punk',
    'Аудиофил зэрэглэлийн дуугаралт, карбон шилэн тон-арм, шинэчлэгдсэн мотор түдгэлзүүлэлтийн систем бүхий дээд.',
    450000,
    NULL,
    'https://images.unsplash.com/photo-1520975969359-5c9f8a2b2b3d?auto=format&fit=crop&w=1200&q=80',
    '{"rpm":"33, 45, 78 (Цахим)","tonearm":"8.6\" Carbon","weight":"5.6 кг"}'::jsonb,
    FALSE,
    12
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111101',
    'Kind of Blue',
    'Miles Davis',
    'Жазын сонгодог — цэвэр аналог дуугаралт.',
    300000,
    240000,
    'https://images.unsplash.com/photo-1522156373667-4c7234bbd804?auto=format&fit=crop&w=1200&q=80',
    '{"rpm":"33⅓","tonearm":"S-образ","weight":"180 г"}'::jsonb,
    FALSE,
    20
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111102',
    'AT-LP120XUSB',
    NULL,
    'USB бичлэгтэй, дижитал хөрвүүлэлттэй пянз тоглуулагч.',
    3490000,
    NULL,
    'https://images.unsplash.com/photo-1560507074-b9eb43a0c9a4?auto=format&fit=crop&w=1200&q=80',
    '{"rpm":"33, 45, 78 (Цахим)","tonearm":"8.6\" Carbon","weight":"5.6 кг"}'::jsonb,
    TRUE,
    5
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111101',
    'Dark Side of the M...',
    'Pink Floyd',
    'Rock сонгодог — өргөн дууны зай.',
    290000,
    NULL,
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1200&q=80',
    '{"rpm":"33⅓","tonearm":"Шулуун","weight":"180 г"}'::jsonb,
    FALSE,
    15
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111103',
    'Kanto YU4 Walnut',
    NULL,
    'Өрөөний чанга яригч — walnut өнгө.',
    4190000,
    NULL,
    'https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=1200&q=80',
    '{"rpm":"—","tonearm":"—","weight":"6.2 кг"}'::jsonb,
    FALSE,
    8
  ),
  (
    '22222222-2222-2222-2222-222222222206',
    '11111111-1111-1111-1111-111111111104',
    'Groove Care Kit',
    NULL,
    'Пянз цэвэрлэх багц.',
    25000,
    18000,
    'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1200&q=80',
    '{"rpm":"—","tonearm":"—","weight":"0.4 кг"}'::jsonb,
    FALSE,
    40
  ),
  (
    '22222222-2222-2222-2222-222222222207',
    '11111111-1111-1111-1111-111111111101',
    'DAMN.',
    'Kendrick Lamar',
    'Hip-hop — өндөр чанартай даралт.',
    320000,
    NULL,
    'https://images.unsplash.com/photo-1526442719524-a603408c90cb?auto=format&fit=crop&w=1200&q=80',
    '{"rpm":"33⅓","tonearm":"—","weight":"180 г"}'::jsonb,
    FALSE,
    18
  )
ON CONFLICT (id) DO NOTHING;
