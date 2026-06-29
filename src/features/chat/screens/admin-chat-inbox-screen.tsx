import { MessageCircle, Search } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { AdminChatThreadRow } from '../components/admin-chat-thread-row';
import { useAdminChatThreadsQuery } from '../api/use-admin-chat-threads-query';
import type { AdminChatThreadListItem } from '../api/use-admin-chat-threads-query';
import { useProfileSearchQuery } from '../api/use-profile-search-query';
import { fetchChatThreadById, fetchOrCreateChatThread } from '../api/use-chat-thread-query';
import type { ChatThreadWithProfile } from '../api/use-chat-thread-query';
import { useToggleFollowUpMutation } from '../api/use-toggle-follow-up-mutation';
import { AdminChatThreadScreen } from './admin-chat-thread-screen';

type ActiveThread = {
  threadId: string;
  title: string;
  phoneNumber: string | null;
  isFollowUp: boolean;
  peerAvatarUrl: string | null;
};

function displayTitle(params: { fullName: string | null; phone: string | null; fallback: string }) {
  const full = params.fullName?.trim();
  if (full) return full;
  const phone = params.phone?.trim();
  if (phone) return phone;
  return params.fallback;
}

type ChatInboxFilter = 'all' | 'follow_up';

const CHAT_INBOX_FILTERS: { id: ChatInboxFilter; label: string }[] = [
  { id: 'all', label: 'Бүгд' },
  { id: 'follow_up', label: 'Follow up' },
];

function AdminChatFilterBar({
  value,
  onChange,
}: {
  value: ChatInboxFilter;
  onChange: (next: ChatInboxFilter) => void;
}) {
  return (
    <FlatList
      data={CHAT_INBOX_FILTERS}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 12 }}
      ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
      renderItem={({ item }) => {
        const isActive = item.id === value;
        return (
          <Pressable
            onPress={() => onChange(item.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
            className={`rounded-full px-4 py-2 ${
              isActive ? 'bg-vinyl-black' : 'bg-vinyl-surface'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                isActive ? 'text-vinyl-paper' : 'text-vinyl-muted'
              }`}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

function AdminChatSearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mb-1.2">
      <Text className="mb-1.8 text-xs font-medium uppercase tracking-wide text-[#757575]">
        Хайх
      </Text>
      <View className="flex-row items-center rounded-xl bg-[#F2F0EF] px-3.5 py-4">
        <Search size={16} color="#757575" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Нэрээр хайх..."
          placeholderTextColor="#A1A1A1"
          autoCapitalize="words"
          autoCorrect={false}
          className="ml-2 flex-1 py-0 text-sm leading-5 text-vinyl-black"
          accessibilityLabel="Хайх"
        />
      </View>
    </View>
  );
}

function AdminChatEmptyState({ message }: { message: string }) {
  return (
    <View className="px-6 pt-10">
      <View className="items-center justify-center rounded-3xl bg-vinyl-surface px-6 py-8">
        <MessageCircle size={30} color="#6B6B6B" />
        <Text className="mt-3 text-center text-sm text-vinyl-muted">{message}</Text>
      </View>
    </View>
  );
}

function threadToActiveThread(
  thread: AdminChatThreadListItem | ChatThreadWithProfile,
): ActiveThread {
  const title = displayTitle({
    fullName: thread.profiles?.full_name ?? null,
    phone: thread.profiles?.phone_number ?? null,
    fallback: thread.user_id,
  });

  return {
    threadId: thread.id,
    title,
    phoneNumber: thread.profiles?.phone_number ?? null,
    isFollowUp: thread.is_follow_up,
    peerAvatarUrl: thread.profiles?.avatar_url ?? null,
  };
}

export function AdminChatInboxScreen({
  initialThreadId,
  onInitialThreadOpened,
}: {
  initialThreadId?: string | null;
  onInitialThreadOpened?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ChatInboxFilter>('all');
  const [active, setActive] = useState<ActiveThread | null>(null);
  const openedInitialThreadRef = useRef<string | null>(null);

  const isSearching = search.trim().length > 0;
  const threadsQuery = useAdminChatThreadsQuery({ enabled: !isSearching });
  const profileQuery = useProfileSearchQuery(search, { enabled: isSearching });
  const followUpMutation = useToggleFollowUpMutation();

  const threadRows = threadsQuery.data ?? [];
  const filteredThreadRows = useMemo(() => {
    if (filter === 'follow_up') {
      return threadRows.filter((thread) => thread.is_follow_up);
    }
    return threadRows;
  }, [threadRows, filter]);
  const profileRows = profileQuery.data ?? [];
  const isPending = isSearching ? profileQuery.isPending : threadsQuery.isPending;
  const isError = isSearching ? profileQuery.isError : threadsQuery.isError;

  useEffect(() => {
    const threadId = initialThreadId?.trim();
    if (!threadId || active) return;
    if (openedInitialThreadRef.current === threadId) return;

    const openThread = (
      thread: AdminChatThreadListItem | ChatThreadWithProfile,
    ) => {
      openedInitialThreadRef.current = threadId;
      setActive(threadToActiveThread(thread));
      onInitialThreadOpened?.();
    };

    const match = threadRows.find((thread) => thread.id === threadId);
    if (match) {
      openThread(match);
      return;
    }

    if (threadsQuery.isPending) return;

    void fetchChatThreadById(threadId)
      .then((thread) => {
        if (thread) {
          openThread(thread);
          return;
        }
        onInitialThreadOpened?.();
      })
      .catch(() => {
        onInitialThreadOpened?.();
      });
  }, [
    active,
    initialThreadId,
    onInitialThreadOpened,
    threadRows,
    threadsQuery.isPending,
  ]);

  if (active) {
    return (
      <AdminChatThreadScreen
        threadId={active.threadId}
        title={active.title}
        phoneNumber={active.phoneNumber}
        isFollowUp={active.isFollowUp}
        peerAvatarUrl={active.peerAvatarUrl}
        onBack={() => setActive(null)}
      />
    );
  }

  return (
    <View className="flex-1 bg-vinyl-paper">
      <View className="px-6 pb-4 pt-2">
        <Text className="font-normal text-[28px] font-bold text-vinyl-black">Мессеж</Text>
        <View className="mt-4">
          <AdminChatSearchField value={search} onChangeText={setSearch} />
          {!isSearching ? (
            <AdminChatFilterBar value={filter} onChange={setFilter} />
          ) : null}
        </View>
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-vinyl-muted">
            {isSearching ? 'Хэрэглэгчид хайж чадсангүй.' : 'Чатуудыг ачаалж чадсангүй.'}
          </Text>
        </View>
      ) : isSearching ? (
        <FlatList
          data={profileRows}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 16 }}
          ItemSeparatorComponent={() => <View className="h-px bg-vinyl-divider/60" />}
          renderItem={({ item: profile }) => {
            const title = displayTitle({
              fullName: profile.full_name,
              phone: profile.phone_number,
              fallback: profile.id,
            });

            return (
              <AdminChatThreadRow
                title={title}
                preview={profile.phone_number?.trim() ?? 'Шинэ чат эхлүүлэх'}
                avatarUrl={profile.avatar_url ?? null}
                onPress={() => {
                  void fetchOrCreateChatThread(profile.id).then((thread) => {
                    setActive({
                      threadId: thread.id,
                      title,
                      phoneNumber: profile.phone_number ?? null,
                      isFollowUp: Boolean(thread.is_follow_up),
                      peerAvatarUrl: profile.avatar_url ?? null,
                    });
                  });
                }}
              />
            );
          }}
          ListEmptyComponent={
            <AdminChatEmptyState message="Ийм нэртэй хэрэглэгч олдсонгүй." />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredThreadRows}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 16 }}
          ItemSeparatorComponent={() => <View className="mx-6 h-px bg-vinyl-divider/60" />}
          renderItem={({ item }) => {
            const title = displayTitle({
              fullName: item.profiles?.full_name ?? null,
              phone: item.profiles?.phone_number ?? null,
              fallback: item.user_id,
            });
            const preview = item.last_message_preview?.trim() ?? 'Шинэ чат';

            return (
              <AdminChatThreadRow
                title={title}
                preview={preview}
                avatarUrl={item.profiles?.avatar_url ?? null}
                lastMessageAt={item.last_message_at}
                unreadCount={item.unread_count}
                isFollowUp={item.is_follow_up}
                onPress={() =>
                  setActive({
                    threadId: item.id,
                    title,
                    phoneNumber: item.profiles?.phone_number ?? null,
                    isFollowUp: item.is_follow_up,
                    peerAvatarUrl: item.profiles?.avatar_url ?? null,
                  })
                }
                onToggleFollowUp={() =>
                  followUpMutation.mutate({ threadId: item.id, next: !item.is_follow_up })
                }
              />
            );
          }}
          ListEmptyComponent={
            <AdminChatEmptyState
              message={
                filter === 'follow_up'
                  ? 'Follow up тэмдэглэсэн чат алга байна.'
                  : 'Одоогоор чат алга байна.'
              }
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
