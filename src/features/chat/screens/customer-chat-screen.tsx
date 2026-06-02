import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { CustomerHomeHeader } from '../../home/components/customer-home-header';
import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { ChatComposer } from '../components/chat-composer';
import { ChatMessageList } from '../components/chat-message-list';
import type { ChatMessageRow } from '../api/use-chat-messages-query';
import { useChatMessagesQuery } from '../api/use-chat-messages-query';
import { useChatThreadQuery } from '../api/use-chat-thread-query';
import { useSendChatMessageMutation } from '../api/use-send-chat-message-mutation';
import { useMarkThreadReadMutation } from '../api/use-mark-thread-read-mutation';
import { chatKeys } from '../api/chat-keys';
import { useKeyboardHeight } from '../hooks/use-keyboard-height';
import { setActiveChatThreadId } from '../lib/active-chat';
import { supabase } from '../../../lib/supabase';

type CustomerChatScreenProps = {
  avatarUrl: string | null;
  cartCount: number;
  onProfilePress: () => void;
  onCartPress: () => void;
};

export function CustomerChatScreen({
  avatarUrl,
  cartCount,
  onProfilePress,
  onCartPress,
}: CustomerChatScreenProps) {
  const qc = useQueryClient();
  const sessionQuery = useAuthSessionQuery();
  const userId = sessionQuery.data?.user.id ?? null;

  const threadQuery = useChatThreadQuery(userId, { enabled: sessionQuery.isSuccess });
  const threadId = threadQuery.data?.id ?? null;

  const messagesQuery = useChatMessagesQuery(threadId, {
    enabled: threadQuery.isSuccess,
  });

  const sendMutation = useSendChatMessageMutation();
  const markReadMutation = useMarkThreadReadMutation();

  const [text, setText] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  const listRef = useRef<FlatList<ChatMessageRow>>(null);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (!threadId) return;
    markReadMutation.mutate({ threadId, role: 'user', userIdForInvalidation: userId ?? undefined });
  }, [threadId, userId]);

  useEffect(() => {
    if (!threadId) return;
    setActiveChatThreadId(threadId);
    return () => {
      setActiveChatThreadId(null);
    };
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !userId) return;
    const channel = supabase
      .channel(`chat-thread-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: chatKeys.messages(threadId) });
          void qc.invalidateQueries({ queryKey: chatKeys.thread(userId) });
          markReadMutation.mutate({
            threadId,
            role: 'user',
            userIdForInvalidation: userId,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, userId, qc]);

  const canSend = useMemo(() => {
    return Boolean((text.trim().length > 0 || localImageUri) && threadId && userId) && !sendMutation.isPending;
  }, [text, localImageUri, threadId, userId, sendMutation.isPending]);

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
    if (!threadId || !userId) return;
    if (!canSend) return;
    sendMutation.mutate(
      {
        threadId,
        senderUserId: userId,
        senderRole: 'user',
        text,
        localImageUri: localImageUri ?? undefined,
      },
      {
        onSuccess: () => {
          setText('');
          setLocalImageUri(null);
          markReadMutation.mutate({
            threadId,
            role: 'user',
            userIdForInvalidation: userId,
          });
        },
      },
    );
  };

  if (sessionQuery.isPending || threadQuery.isPending) {
    return (
      <View className="flex-1 bg-vinyl-paper">
        <CustomerHomeHeader
          avatarUrl={avatarUrl}
          cartCount={cartCount}
          onProfilePress={onProfilePress}
          onCartPress={onCartPress}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  if (sessionQuery.isError || !userId) {
    return (
      <View className="flex-1 bg-vinyl-paper">
        <CustomerHomeHeader
          avatarUrl={avatarUrl}
          cartCount={cartCount}
          onProfilePress={onProfilePress}
          onCartPress={onCartPress}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-semibold text-vinyl-black">
            Нэвтрэлт шаардлагатай
          </Text>
        </View>
      </View>
    );
  }

  if (threadQuery.isError) {
    return (
      <View className="flex-1 bg-vinyl-paper">
        <CustomerHomeHeader
          avatarUrl={avatarUrl}
          cartCount={cartCount}
          onProfilePress={onProfilePress}
          onCartPress={onCartPress}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-semibold text-vinyl-black">
            Чатыг ачаалж чадсангүй
          </Text>
          <Text className="mt-2 text-center text-sm text-vinyl-muted">
            Supabase болон сүлжээний тохиргоогоо шалгана уу.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-vinyl-paper">
      <View className="flex-1">
          <CustomerHomeHeader
            avatarUrl={avatarUrl}
            cartCount={cartCount}
            onProfilePress={onProfilePress}
            onCartPress={onCartPress}
          />

          <View className="mt-2 px-6 pb-3">
            <Text className="text-2xl font-extrabold text-vinyl-black">Тусламж</Text>
            <Text className="mt-1 text-sm text-vinyl-muted">
              Админтай чатлаарай. Зураг илгээж болно.
            </Text>
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
                currentUserId={userId}
                useBrandAvatar
                scrollToBottomKey={threadId}
                onScrollBeginDrag={() => {
                  if (threadId) {
                    markReadMutation.mutate({
                      threadId,
                      role: 'user',
                      userIdForInvalidation: userId,
                    });
                  }
                }}
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
    </View>
  );
}

