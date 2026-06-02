import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { debugLog } from '../../../lib/debug-log';
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
      const pushRes = await supabase.functions.invoke('send-chat-push', {
        body: { threadId, messageId: row.id },
      });

      let pushBody: unknown = null;
      try {
        pushBody = pushRes.data ?? (await pushRes.response?.json());
      } catch {
        pushBody = null;
      }

      await debugLog(
        'use-send-chat-message-mutation.ts',
        'send-chat-push invoke result',
        {
          threadId,
          messageId: row.id,
          error: pushRes.error?.message ?? null,
          status: pushRes.response?.status ?? null,
          body: pushBody,
        },
        'H5',
      );

      try {
        await AsyncStorage.setItem(
          'vinylhead.push.lastInvoke',
          JSON.stringify(
            typeof pushBody === 'object' && pushBody !== null ? pushBody : { raw: pushBody },
          ),
        );
      } catch {
        /* non-fatal */
      }

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

