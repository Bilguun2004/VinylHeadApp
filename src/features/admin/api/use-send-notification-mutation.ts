import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { NotificationCategory } from '../lib/notification-categories';
import { sendExpoPushBatch } from '../lib/send-expo-push';
import { uploadProductImageFromUri } from '../lib/upload-product-image';
import { adminNotificationKeys } from './use-admin-notifications-query';

export type SendNotificationInput = {
  title: string;
  body: string;
  category: NotificationCategory;
  localImageUri?: string;
  ownerUserId: string;
};

export function useSendNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendNotificationInput) => {
      const title = input.title.trim();
      const body = input.body.trim();
      if (!title) throw new Error('Гарчиг оруулна уу.');
      if (!body) throw new Error('Үндсэн текст оруулна уу.');

      let image_url: string | null = null;
      if (input.localImageUri?.trim()) {
        image_url = await uploadProductImageFromUri({
          localUri: input.localImageUri,
          ownerUserId: input.ownerUserId,
        });
      }

      const { data: row, error: insertError } = await supabase
        .from('broadcast_notifications')
        .insert({
          title,
          body,
          category: input.category,
          image_url,
          created_by: input.ownerUserId,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { data: tokens, error: tokenError } = await supabase
        .from('expo_push_tokens')
        .select('token');

      if (tokenError) throw tokenError;

      const uniqueTokens = [
        ...new Set(
          (tokens ?? [])
            .map((t) => t.token?.trim())
            .filter((t): t is string => Boolean(t)),
        ),
      ];

      let pushSummary = { sent: 0, failed: 0 };
      if (uniqueTokens.length > 0) {
        pushSummary = await sendExpoPushBatch(
          uniqueTokens.map((to) => ({
            to,
            title,
            body,
            sound: 'default',
            priority: 'high' as const,
            channelId: 'default',
            data: {
              notificationId: row.id,
              category: input.category,
            },
          })),
        );
      }

      return { notificationId: row.id, ...pushSummary, tokenCount: uniqueTokens.length };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminNotificationKeys.all,
      });
    },
  });
}
