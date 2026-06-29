import { ShoppingBag } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';

import { ProfileAvatar } from '../../profile/components/profile-avatar';

type CustomerHomeHeaderProps = {
  avatarUrl: string | null;
  cartCount: number;
  onProfilePress: () => void;
  onCartPress: () => void;
};

export function CustomerHomeHeader({
  avatarUrl,
  cartCount,
  onProfilePress,
  onCartPress,
}: CustomerHomeHeaderProps) {
  return (
    <View className="px-6 pt-2">
      <View className="flex-row items-center justify-between">
        <ProfileAvatar
          avatarUrl={avatarUrl}
          onPress={onProfilePress}
          accessibilityLabel="Профайл"
        />

        <Image
          source={require('../../../../assets/logo.png')}
          style={{ width: 26, height: 26 }}
          resizeMode="contain"
          accessibilityLabel="VinylHead"
        />

        <Pressable
          onPress={onCartPress}
          accessibilityRole="button"
          accessibilityLabel={
            cartCount > 0 ? `Сагс, ${cartCount} бараа` : 'Сагс'
          }
          hitSlop={8}
          className="h-10 w-10 items-center justify-center"
        >
          <View className="relative">
            <ShoppingBag size={20} color="#0A0A0A" />
            {cartCount > 0 ? (
              <View className="absolute -right-1.5 -top-1 min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1">
                <Text className="text-[10px] font-bold text-vinyl-paper">
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
