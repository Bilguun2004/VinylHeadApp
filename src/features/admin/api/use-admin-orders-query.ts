import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { Json, Tables } from '../../../types/supabase';

export const adminOrderKeys = {
  all: ['admin', 'orders'] as const,
  list: () => [...adminOrderKeys.all, 'list'] as const,
};

export type AdminOrderRow = Tables<'orders'>;

export type AdminOrderItemRow = Tables<'order_items'> & {
  products: Pick<
    Tables<'products'>,
    'id' | 'title' | 'artist' | 'image_url' | 'description'
  > | null;
  gift_options: Pick<Tables<'gift_options'>, 'id' | 'name' | 'image_url'> | null;
};

export type AdminOrderWithDetails = AdminOrderRow & {
  profiles: Pick<Tables<'profiles'>, 'full_name' | 'phone_number'> | null;
  order_items: AdminOrderItemRow[];
};

export type OrderDeliveryInfo = {
  full_name?: string;
  phone?: string;
  city?: string;
  district?: string;
  address?: string;
};

function parseDeliveryInfo(
  raw: Json | null,
): OrderDeliveryInfo | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  return {
    full_name: typeof o.full_name === 'string' ? o.full_name : undefined,
    phone: typeof o.phone === 'string' ? o.phone : undefined,
    city: typeof o.city === 'string' ? o.city : undefined,
    district: typeof o.district === 'string' ? o.district : undefined,
    address: typeof o.address === 'string' ? o.address : undefined,
  };
}

const orderSelect = `
  id,
  user_id,
  order_number,
  status,
  payment_method,
  payment_status,
  subtotal,
  delivery_fee,
  gift_wrap_total,
  total_amount,
  delivery_info,
  created_at,
  updated_at,
  profiles ( full_name, phone_number ),
  order_items (
    id,
    order_id,
    product_id,
    quantity,
    unit_price,
    gift_option_id,
    laser_print_image_url,
    laser_print_text,
    laser_print_font,
    laser_print_note,
    created_at,
    products ( id, title, artist, image_url, description ),
    gift_options!order_items_gift_option_id_fkey (
      id,
      name,
      image_url
    )
  )
`;

type GiftOptionSnapshot = Pick<
  Tables<'gift_options'>,
  'id' | 'name' | 'image_url'
>;

export async function attachMissingGiftOptions(
  orders: AdminOrderWithDetails[],
): Promise<AdminOrderWithDetails[]> {
  const missingIds = new Set<string>();
  for (const order of orders) {
    for (const item of order.order_items) {
      if (item.gift_option_id && !item.gift_options) {
        missingIds.add(item.gift_option_id);
      }
    }
  }
  if (missingIds.size === 0) return orders;

  const { data: gifts, error } = await supabase
    .from('gift_options')
    .select('id, name, image_url')
    .in('id', [...missingIds]);

  if (error) throw error;

  const byId = new Map(
    (gifts ?? []).map((g) => [g.id, g as GiftOptionSnapshot]),
  );

  return orders.map((order) => ({
    ...order,
    order_items: order.order_items.map((item) =>
      item.gift_option_id && !item.gift_options
        ? { ...item, gift_options: byId.get(item.gift_option_id) ?? null }
        : item,
    ),
  }));
}

async function fetchAdminOrders(): Promise<AdminOrderWithDetails[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(orderSelect)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const orders = (data ?? []) as AdminOrderWithDetails[];
  return attachMissingGiftOptions(orders);
}

export function giftWrapImageUrl(item: AdminOrderItemRow): string | null {
  const url = item.gift_options?.image_url?.trim();
  return url || null;
}

export function useAdminOrdersQuery() {
  return useQuery({
    queryKey: adminOrderKeys.list(),
    queryFn: fetchAdminOrders,
  });
}

export function deliveryInfoFromOrder(
  order: AdminOrderWithDetails,
): OrderDeliveryInfo | null {
  return parseDeliveryInfo(order.delivery_info);
}

export function customerNameFromOrder(order: AdminOrderWithDetails): string {
  const delivery = deliveryInfoFromOrder(order);
  const name = delivery?.full_name?.trim();
  if (name) return name;
  const profileName = order.profiles?.full_name?.trim();
  if (profileName) return profileName;
  return 'Хэрэглэгч';
}

export function customerPhoneFromOrder(order: AdminOrderWithDetails): string {
  const delivery = deliveryInfoFromOrder(order);
  const phone = delivery?.phone?.trim();
  if (phone) return phone;
  return order.profiles?.phone_number?.trim() ?? '';
}

export function deliveryAddressLines(order: AdminOrderWithDetails): string[] {
  const d = deliveryInfoFromOrder(order);
  if (!d) return [];
  const lines: string[] = [];
  const cityDistrict = [d.city, d.district].filter(Boolean).join(', ');
  if (cityDistrict) lines.push(cityDistrict);
  if (d.address?.trim()) lines.push(d.address.trim());
  return lines;
}

export function formatOrderDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${mo}.${day} · ${h}:${min}`;
}

export function primaryOrderItem(order: AdminOrderWithDetails): AdminOrderItemRow | null {
  return order.order_items[0] ?? null;
}

export function productLineSubtitle(item: AdminOrderItemRow | null): string {
  if (!item?.products) return '';
  const artist = item.products.artist?.trim();
  const title = item.products.title?.trim() ?? '';
  if (artist && title) return `${artist} · ${title}`;
  return artist || title;
}
