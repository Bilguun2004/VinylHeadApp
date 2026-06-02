import { Star } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { ProfileAvatar } from '../../profile/components/profile-avatar';
import { formatChatListTime } from '../lib/format-chat-list-time';

type AdminChatThreadRowProps = {
  title: string;
  preview: string;
  avatarUrl: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  isFollowUp?: boolean;
  onPress: () => void;
  onToggleFollowUp?: () => void;
};

function UnreadBadge({ count }: { count: number }) {
  const label = count > 99 ? '99+' : String(count);
  const isHighVolume = count >= 10;

  return (
    <View
      className="min-h-[20px] min-w-[20px] items-center justify-center rounded-full px-1"
      style={{ backgroundColor: isHighVolume ? '#9CA3AF' : '#F97316' }}
    >
      <Text className="text-[11px] font-bold text-white">{label}</Text>
    </View>
  );
}

export function AdminChatThreadRow({
  title,
  preview,
  avatarUrl,
  lastMessageAt,
  unreadCount = 0,
  isFollowUp = false,
  onPress,
  onToggleFollowUp,
}: AdminChatThreadRowProps) {
  const timestamp = formatChatListTime(lastMessageAt);

  return (
    <View className="flex-row items-center px-6 py-2">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title} чат нээх`}
        className="min-w-0 flex-1 flex-row items-center active:opacity-80"
      >
        <ProfileAvatar avatarUrl={avatarUrl} size={44} />

        <View className="ml-3 flex-1 justify-center pr-2">
          <Text
            className="font-serif text-base font-bold leading-5 text-vinyl-black"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text className="mt-0.5 text-[13px] leading-4 text-vinyl-muted" numberOfLines={1}>
            {preview}
          </Text>
        </View>
      </Pressable>

      <View className="w-11 items-end gap-1">
        {onToggleFollowUp ? (
          <Pressable
            onPress={onToggleFollowUp}
            accessibilityRole="button"
            accessibilityLabel="Follow up"
            hitSlop={8}
            className="h-7 w-7 items-center justify-center"
          >
            <Star
              size={16}
              color={isFollowUp ? '#0A0A0A' : '#A1A1A1'}
              fill={isFollowUp ? '#0A0A0A' : 'transparent'}
            />
          </Pressable>
        ) : (
          <View className="h-7" />
        )}

        {timestamp ? (
          <Text className="text-[11px] text-vinyl-muted">{timestamp}</Text>
        ) : null}

        {unreadCount > 0 ? <UnreadBadge count={unreadCount} /> : null}
      </View>
    </View>
  );
}
