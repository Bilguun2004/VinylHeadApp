import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthSessionQuery, useIsAdmin } from '../api/use-auth-session-query';

type AdminRouteGuardProps = {
  children: ReactNode;
};

/**
 * Blocks non-admin users from rendering admin-only routes. RLS already protects
 * the data layer; this also hides the admin UI/API surface from regular users.
 */
export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const router = useRouter();
  const sessionQuery = useAuthSessionQuery();
  const isAdmin = useIsAdmin();

  const resolved = sessionQuery.isSuccess || sessionQuery.isError;

  useEffect(() => {
    if (resolved && !isAdmin) {
      router.replace('/home');
    }
  }, [resolved, isAdmin, router]);

  if (!resolved || !isAdmin) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        accessibilityLabel="Ачаалж байна"
      >
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}
