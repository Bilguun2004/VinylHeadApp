import { MessageCircle, Search, ShoppingBag, Store, User } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type CustomerTab = 'shop' | 'search' | 'chat' | 'cart' | 'profile';

type TabConfig = {
  id: CustomerTab;
  label: string;
  Icon: typeof Store;
};

const TABS: TabConfig[] = [
  { id: 'shop', label: 'Дэлгүүр', Icon: Store },
  { id: 'search', label: 'Хайх', Icon: Search },
  { id: 'chat', label: 'Чат', Icon: MessageCircle },
  { id: 'cart', label: 'Сагс', Icon: ShoppingBag },
  { id: 'profile', label: 'Профайл', Icon: User },
];

type CustomerBottomNavProps = {
  activeTab: CustomerTab;
  onTabChange: (tab: CustomerTab) => void;
  cartCount?: number;
  chatHasUnread?: boolean;
};

export function CustomerBottomNav({
  activeTab,
  onTabChange,
  cartCount = 0,
  chatHasUnread = false,
}: CustomerBottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="rounded-t-3xl bg-vinyl-canvas"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View className="flex-row items-end px-2 pt-3">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const color = isActive ? '#0A0A0A' : '#6B6B6B';

          return (
            <Pressable
              key={id}
              onPress={() => onTabChange(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
              className="flex-1 items-center py-1"
              hitSlop={4}
            >
              <View className="relative mb-1.5 h-7 items-center justify-center">
                <Icon
                  size={22}
                  color={color}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                {id === 'cart' && cartCount > 0 ? (
                  <View className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-red-600" />
                ) : null}
                {id === 'chat' && chatHasUnread ? (
                  <View className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-red-600" />
                ) : null}
              </View>
              <Text
                className={`text-xs ${
                  isActive ? 'font-semibold text-vinyl-black' : 'text-vinyl-muted'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
