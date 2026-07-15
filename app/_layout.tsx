import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthGate } from '../src/features/auth/components/auth-gate';
import { CartProvider } from '../src/features/cart/context/cart-context';
import { InAppNotificationProvider } from '../src/features/notifications/in-app-notification-context';
import {
  InAppNotificationHost,
  NotificationListeners,
} from '../src/features/notifications/notification-listeners';
import { useInstagramStoryFonts } from '../src/features/products/hooks/use-instagram-story-fonts';
import { queryClient } from '../src/lib/query-client';

export default function RootLayout() {
  const { loaded: fontsLoaded } = useInstagramStoryFonts();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <CartProvider>
            <InAppNotificationProvider>
              <AuthGate>
                <NotificationListeners />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="sign-up" />
                  <Stack.Screen name="forgot-password" />
                  <Stack.Screen name="reset-password" />
                  <Stack.Screen name="auth-callback" />
                  <Stack.Screen name="home" />
                  <Stack.Screen name="product/[id]" />
                  <Stack.Screen name="product/[id]/reviews" />
                  <Stack.Screen name="product/[id]/review-photos" />
                  <Stack.Screen name="admin/add-product" />
                  <Stack.Screen name="admin/order/[id]" />
                  <Stack.Screen name="order/[id]" />
                  <Stack.Screen name="profile/orders" />
                </Stack>
              </AuthGate>
              <InAppNotificationHost />
              <StatusBar style="dark" />
            </InAppNotificationProvider>
          </CartProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
