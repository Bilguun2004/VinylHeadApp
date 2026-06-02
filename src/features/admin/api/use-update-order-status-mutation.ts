import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { toggleOrderStatus } from '../lib/order-status';
import { adminOrderKeys } from './use-admin-orders-query';

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { orderId: string; currentStatus: string }) => {
      const nextStatus = toggleOrderStatus(input.currentStatus);
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', input.orderId);

      if (error) throw error;
      return nextStatus;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
    },
  });
}
