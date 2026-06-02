import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/supabase';

export const adminNotificationKeys = {
  all: ['admin', 'notifications'] as const,
  list: () => [...adminNotificationKeys.all, 'list'] as const,
};

export type BroadcastNotificationRow =
  Database['public']['Tables']['broadcast_notifications']['Row'];

async function fetchBroadcastNotifications(): Promise<
  BroadcastNotificationRow[]
> {
  const { data, error } = await supabase
    .from('broadcast_notifications')
    .select('*')
    .order('sent_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function useAdminNotificationsQuery() {
  return useQuery({
    queryKey: adminNotificationKeys.list(),
    queryFn: fetchBroadcastNotifications,
  });
}
