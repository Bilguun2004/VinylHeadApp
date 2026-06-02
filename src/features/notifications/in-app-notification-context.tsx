import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type InAppNotificationPayload = {
  id: string;
  /** Bold name line (Instagram-style username). */
  username: string;
  /** Message preview after the username. */
  body: string;
  avatarUrl?: string | null;
  appName?: string;
  data?: Record<string, unknown>;
};

type InAppNotificationContextValue = {
  notification: InAppNotificationPayload | null;
  showNotification: (payload: InAppNotificationPayload) => void;
  dismissNotification: () => void;
};

const InAppNotificationContext =
  createContext<InAppNotificationContextValue | null>(null);

export function InAppNotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] =
    useState<InAppNotificationPayload | null>(null);

  const showNotification = useCallback((payload: InAppNotificationPayload) => {
    setNotification(payload);
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const value = useMemo(
    () => ({ notification, showNotification, dismissNotification }),
    [notification, showNotification, dismissNotification],
  );

  return (
    <InAppNotificationContext.Provider value={value}>
      {children}
    </InAppNotificationContext.Provider>
  );
}

export function useInAppNotification() {
  const ctx = useContext(InAppNotificationContext);
  if (!ctx) {
    throw new Error(
      'useInAppNotification must be used within InAppNotificationProvider',
    );
  }
  return ctx;
}
