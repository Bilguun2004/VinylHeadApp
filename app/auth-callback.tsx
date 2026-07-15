import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createSessionFromUrl } from '../src/features/auth/lib/create-session-from-url';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      if (typeof window === 'undefined') {
        router.replace('/');
        return;
      }

      const result = await createSessionFromUrl(window.location.href);
      if (!mounted) return;

      if (result.ok) {
        router.replace('/');
        return;
      }

      setError(
        result.error ??
          'Нэвтрэх хүсэлтийг дуусгах боломжгүй байна. Дахин оролдоно уу.',
      );
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-vinyl-paper px-6">
      {error ? (
        <Text className="text-center text-base text-red-600">{error}</Text>
      ) : (
        <View className="items-center">
          <ActivityIndicator size="large" />
          <Text className="mt-4 text-center text-sm text-vinyl-muted">
            Нэвтэрч байна…
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
