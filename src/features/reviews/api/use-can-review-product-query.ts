import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { reviewKeys } from './review-keys';

async function checkCanReview(
  productId: string,
  userId: string,
): Promise<boolean> {
  const { data: existing, error: reviewError } = await supabase
    .from('product_reviews')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle();

  if (reviewError) throw reviewError;
  if (existing) return false;

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, order_items!inner(product_id)')
    .eq('user_id', userId)
    .eq('order_items.product_id', productId);

  if (ordersError) throw ordersError;

  const hasDelivered = (orders ?? []).some((o) => {
    const status = String(o.status ?? '').trim().toLowerCase();
    return status === 'delivered' || status === 'хүргэгдсэн';
  });

  return hasDelivered;
}

export function useCanReviewProductQuery(
  productId: string | undefined,
  userId: string | undefined,
) {
  const pid = productId?.trim() ?? '';
  const uid = userId?.trim() ?? '';
  return useQuery({
    queryKey: reviewKeys.canReview(pid, uid),
    queryFn: () => checkCanReview(pid, uid),
    enabled: pid.length > 0 && uid.length > 0,
  });
}
