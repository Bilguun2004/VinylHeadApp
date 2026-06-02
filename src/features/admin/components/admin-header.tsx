import { LogOut } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, View } from 'react-native';

import { useSignOutMutation } from '../../auth/api/use-sign-out-mutation';

type AdminHeaderProps = {
  leftAction?: ReactNode;
};

export function AdminHeader({ leftAction }: AdminHeaderProps) {
  const signOutMutation = useSignOutMutation();

  const handleLogout = () => {
    Alert.alert('Гарах', 'Та гарахдаа итгэлтэй байна уу?', [
      { text: 'Цуцлах', style: 'cancel' },
      {
        text: 'Гарах',
        style: 'destructive',
        onPress: () => {
          signOutMutation.mutate(undefined, {
            onError: (err) => {
              const message =
                err instanceof Error ? err.message : 'Гарахад алдаа гарлаа.';
              Alert.alert('Алдаа', message);
            },
          });
        },
      },
    ]);
  };

  return (
    <View className="px-6 pt-2">
      <View className="flex-row items-center justify-between">
        <View className="h-10 w-10 items-center justify-center">
          {leftAction ?? null}
        </View>

        <Image
          source={require('../../../../assets/logo.png')}
          style={{ width: 26, height: 26 }}
          resizeMode="contain"
          accessibilityLabel="VinylHead"
        />

        <Pressable
          onPress={handleLogout}
          disabled={signOutMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Гарах"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center"
        >
          {signOutMutation.isPending ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <LogOut size={22} color="#DC2626" strokeWidth={2} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
