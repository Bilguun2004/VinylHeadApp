import { useCallback, useEffect, useRef, type RefObject } from 'react';
import {
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { ChatMessageRow } from '../api/use-chat-messages-query';
import { getMessageGroupMeta } from '../lib/message-grouping';
import { ChatMessageBubble } from './chat-message-bubble';

const NEAR_BOTTOM_THRESHOLD = 96;

type ChatMessageListProps = {
  messages: ChatMessageRow[];
  currentUserId: string | null;
  listRef?: RefObject<FlatList<ChatMessageRow> | null>;
  peerAvatarUrl?: string | null;
  useBrandAvatar?: boolean;
  scrollToBottomKey?: string | null;
  onScrollBeginDrag?: () => void;
};

export function ChatMessageList({
  messages,
  currentUserId,
  listRef,
  peerAvatarUrl,
  useBrandAvatar = false,
  scrollToBottomKey,
  onScrollBeginDrag,
}: ChatMessageListProps) {
  const internalRef = useRef<FlatList<ChatMessageRow>>(null);
  const flatListRef = listRef ?? internalRef;

  const isNearBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const pendingInstantScrollRef = useRef(false);
  const allowAnimatedScrollRef = useRef(false);
  const contentSizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback((animated: boolean) => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, [flatListRef, messages.length]);

  useEffect(() => {
    isNearBottomRef.current = true;
    lastMessageIdRef.current = null;
    pendingInstantScrollRef.current = true;
    allowAnimatedScrollRef.current = false;

    const timer = setTimeout(() => {
      allowAnimatedScrollRef.current = true;
    }, 400);

    return () => clearTimeout(timer);
  }, [scrollToBottomKey]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastId = lastMessage?.id ?? null;
    const isNewMessage = Boolean(lastId && lastId !== lastMessageIdRef.current);
    lastMessageIdRef.current = lastId;

    if (pendingInstantScrollRef.current) {
      pendingInstantScrollRef.current = false;
      scrollToBottom(false);
      return;
    }

    if (isNewMessage && isNearBottomRef.current) {
      scrollToBottom(true);
    }
  }, [messages, scrollToBottom, scrollToBottomKey]);

  useEffect(() => {
    return () => {
      if (contentSizeTimerRef.current) {
        clearTimeout(contentSizeTimerRef.current);
      }
    };
  }, []);

  const updateNearBottom = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const visibleHeight = layoutMeasurement.height;
    if (contentSize.height <= visibleHeight) {
      isNearBottomRef.current = true;
      return;
    }
    const distanceFromBottom =
      contentSize.height - visibleHeight - contentOffset.y;
    isNearBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (!isNearBottomRef.current) return;

    if (contentSizeTimerRef.current) {
      clearTimeout(contentSizeTimerRef.current);
    }

    contentSizeTimerRef.current = setTimeout(() => {
      scrollToBottom(allowAnimatedScrollRef.current);
    }, 64);
  }, [scrollToBottom]);

  const renderItem: ListRenderItem<ChatMessageRow> = useCallback(
    ({ item, index }) => {
      const isMine = item.sender_user_id === currentUserId;
      const group = getMessageGroupMeta(messages, index);

      return (
        <ChatMessageBubble
          message={item}
          isMine={isMine}
          group={group}
          peerAvatarUrl={peerAvatarUrl}
          useBrandAvatar={useBrandAvatar && !isMine}
        />
      );
    },
    [messages, currentUserId, peerAvatarUrl, useBrandAvatar],
  );

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(m) => m.id}
      renderItem={renderItem}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 12, paddingTop: 4 }}
      showsVerticalScrollIndicator={false}
      onScroll={updateNearBottom}
      scrollEventThrottle={16}
      onContentSizeChange={handleContentSizeChange}
      onScrollBeginDrag={onScrollBeginDrag}
    />
  );
}
