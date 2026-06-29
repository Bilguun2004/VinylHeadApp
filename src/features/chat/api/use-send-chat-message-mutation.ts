import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { uploadChatImageFromUri } from '../lib/upload-chat-image';
import { chatKeys } from './chat-keys';

export type SendChatMessageInput = {
  threadId: string;
  senderUserId: string;
  senderRole: 'user' | 'admin';
  text?: string;
  localImageUri?: string;
};

export function useSendChatMessageMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendChatMessageInput) => {
      const threadId = input.threadId.trim();
      const senderUserId = input.senderUserId.trim();
      const text = input.text?.trim() ?? '';
      const localImageUri = input.localImageUri?.trim() ?? '';

      if (!threadId) throw new Error('Thread is missing.');
      if (!senderUserId) throw new Error('Sender is missing.');
      if (!text && !localImageUri) throw new Error('Мессеж бичнэ үү.');

      let imageUrl: string | null = null;
      if (localImageUri) {
        imageUrl = await uploadChatImageFromUri({
          localUri: localImageUri,
          userId: senderUserId,
        });
      }

      const { data: row, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_user_id: senderUserId,
          sender_role: input.senderRole,
          text: text || null,
          image_url: imageUrl,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      // Trigger push (server may suppress if receiver is currently active in chat).
      // Best-effort: a delivery failure should not fail the message send.
      await supabase.functions
        .invoke('send-chat-push', {
          body: { threadId, messageId: row.id },
        })
        .catch(() => undefined);

      return { messageId: row.id };
    },
    onSuccess: async (_data, input) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: chatKeys.messages(input.threadId) }),
        qc.invalidateQueries({ queryKey: chatKeys.thread(input.senderUserId) }),
      ]);
    },
  });
}

