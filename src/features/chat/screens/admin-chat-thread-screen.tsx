import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Star } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { ChatComposer } from '../components/chat-composer';
import { ChatMessageList } from '../components/chat-message-list';
import type { ChatMessageRow } from '../api/use-chat-messages-query';
import { useChatMessagesQuery } from '../api/use-chat-messages-query';
import { useSendChatMessageMutation } from '../api/use-send-chat-message-mutation';
import { useMarkThreadReadMutation } from '../api/use-mark-thread-read-mutation';
import { useToggleFollowUpMutation } from '../api/use-toggle-follow-up-mutation';
import { chatKeys } from '../api/chat-keys';
import { useKeyboardHeight } from '../hooks/use-keyboard-height';
import { setActiveChatThreadId } from '../lib/active-chat';
import { usePostgresChannel } from '../hooks/use-postgres-channel';

type Props = {
  threadId: string;
  title: string;
  phoneNumber: string | null;
  isFollowUp: boolean;
  peerAvatarUrl?: string | null;
  onBack: () => void;
};

export function AdminChatThreadScreen({
  threadId,
  title,
  phoneNumber,
  isFollowUp,
  peerAvatarUrl,
  onBack,
}: Props) {
  const qc = useQueryClient();
  const sessionQuery = useAuthSessionQuery();
  const adminId = sessionQuery.data?.user.id ?? null;

  const messagesQuery = useChatMessagesQuery(threadId, { enabled: Boolean(threadId) });
  const sendMutation = useSendChatMessageMutation();
  const markReadMutation = useMarkThreadReadMutation();
  const followUpMutation = useToggleFollowUpMutation();

  const [text, setText] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  const listRef = useRef<FlatList<ChatMessageRow>>(null);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (!threadId) return;
    markReadMutation.mutate({ threadId, role: 'admin' });
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;
    setActiveChatThreadId(threadId);
    return () => {
      setActiveChatThreadId(null);
    };
  }, [threadId]);

  usePostgresChannel({
    enabled: Boolean(threadId),
    channelKey: threadId ? `chat-thread-admin-${threadId}` : '',
    setup: (channel) => {
      if (!threadId) return;
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: chatKeys.messages(threadId) });
          void qc.invalidateQueries({ queryKey: chatKeys.adminThreads('') });
          markReadMutation.mutate({ threadId, role: 'admin' });
        },
      );
    },
  });

  const canSend = useMemo(() => {
    return Boolean((text.trim().length > 0 || localImageUri) && threadId && adminId) && !sendMutation.isPending;
  }, [text, localImageUri, threadId, adminId, sendMutation.isPending]);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (res.canceled) return;
    const uri = res.assets?.[0]?.uri;
    if (uri) setLocalImageUri(uri);
  };

  const onSend = () => {
    if (!threadId || !adminId) return;
    if (!canSend) return;
    sendMutation.mutate(
      {
        threadId,
        senderUserId: adminId,
        senderRole: 'admin',
        text,
        localImageUri: localImageUri ?? undefined,
      },
      {
        onSuccess: () => {
          setText('');
          setLocalImageUri(null);
          markReadMutation.mutate({ threadId, role: 'admin' });
        },
        onError: (err) => {
          Alert.alert(
            'Илгээж чадсангүй',
            err instanceof Error
              ? err.message
              : 'Мессеж илгээхэд алдаа гарлаа. Дахин оролдоно уу.',
          );
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-vinyl-paper">
      <View className="flex-row items-center justify-between px-6 pb-3 pt-2">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Буцах"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center"
        >
          <ArrowLeft size={22} color="#0A0A0A" />
        </Pressable>

        <View className="flex-1 px-3">
          <Text className="text-base font-semibold text-vinyl-black" numberOfLines={1}>
            {title}
          </Text>
          {phoneNumber?.trim() && phoneNumber.trim() !== title.trim() ? (
            <Text className="text-xs text-vinyl-muted" numberOfLines={1}>
              {phoneNumber.trim()}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => followUpMutation.mutate({ threadId, next: !isFollowUp })}
          accessibilityRole="button"
          accessibilityLabel="Follow up"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center"
        >
          <Star
            size={22}
            color={isFollowUp ? '#0A0A0A' : '#6B6B6B'}
            fill={isFollowUp ? '#0A0A0A' : 'transparent'}
          />
        </Pressable>
      </View>

      {messagesQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : messagesQuery.isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-vinyl-muted">
            Мессежүүдийг ачаалж чадсангүй.
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <ChatMessageList
            listRef={listRef}
            messages={messagesQuery.data ?? []}
            currentUserId={adminId}
            peerAvatarUrl={peerAvatarUrl}
            scrollToBottomKey={threadId}
          />
        </View>
      )}

      <ChatComposer
        text={text}
        onChangeText={setText}
        onSend={onSend}
        onPickImage={() => void pickImage()}
        canSend={canSend}
        isSending={sendMutation.isPending}
        localImageUri={localImageUri}
        onClearImage={() => setLocalImageUri(null)}
        style={keyboardHeight > 0 ? { paddingBottom: keyboardHeight + 12 } : undefined}
      />
    </View>
  );
}

