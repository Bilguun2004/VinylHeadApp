import { useQuery } from '@tanstack/react-query';

import {
  attachMissingGiftOptions,
  type AdminOrderWithDetails,
} from '../../admin/api/use-admin-orders-query';
import { supabase } from '../../../lib/supabase';

export const customerOrderKeys = {
  all: ['customer', 'orders'] as const,
  list: (userId: string) => [...customerOrderKeys.all, 'list', { userId }] as const,
};

const orderSelect = `
  id,
  user_id,
  order_number,
  status,
  payment_method,
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
    created_at,
    products ( id, title, artist, image_url, description ),
    gift_options!order_items_gift_option_id_fkey (
      id,
      name,
      image_url
    )
  )
`;

async function fetchCustomerOrders(userId: string): Promise<AdminOrderWithDetails[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(orderSelect)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const orders = (data ?? []) as AdminOrderWithDetails[];
  return attachMissingGiftOptions(orders);
}

export function useCustomerOrdersQuery(userId: string | undefined) {
  const id = userId?.trim() ?? '';
  return useQuery({
    queryKey: customerOrderKeys.list(id),
    queryFn: () => fetchCustomerOrders(id),
    enabled: id.length > 0,
  });
}
