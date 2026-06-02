import { User } from 'lucide-react-native';
import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { InAppNotificationPayload } from './in-app-notification-context';

type InAppNotificationBannerProps = {
  notification: InAppNotificationPayload;
  onDismiss: () => void;
  onPress: () => void;
};

const AUTO_DISMISS_MS = 4500;

function truncate(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`;
}

export function InAppNotificationBanner({
  notification,
  onDismiss,
  onPress,
}: InAppNotificationBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 260 });
    opacity.value = withTiming(1, { duration: 180 });

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) {
          runOnJS(onDismiss)();
        }
      });
      translateY.value = withTiming(-24, { duration: 180 });
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const preview = truncate(notification.body, 90);
  const appName = notification.appName ?? 'VinylHead';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 6 }, animatedStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${notification.username}. ${preview}`}
        onPress={onPress}
        style={styles.card}
      >
        <View style={styles.avatarWrap}>
          {notification.avatarUrl ? (
            <Image
              source={{ uri: notification.avatarUrl }}
              style={styles.avatar}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <User size={22} color="#262626" strokeWidth={2} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.appName} numberOfLines={1}>
              {appName}
            </Text>
            <Text style={styles.time}>Одоо</Text>
          </View>

          <Text style={styles.messageLine} numberOfLines={2}>
            <Text style={styles.username}>{notification.username} </Text>
            <Text style={styles.preview}>{preview}</Text>
          </Text>
        </View>

        <Image
          source={require('../../../assets/icon.png')}
          style={styles.appThumb}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10000,
    elevation: 10000,
  },
  card: {
    marginHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DBDBDB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarWrap: {
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DBDBDB',
    backgroundColor: '#FAFAFA',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  appName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E8E',
    letterSpacing: 0.2,
  },
  time: {
    fontSize: 11,
    color: '#8E8E8E',
  },
  messageLine: {
    fontSize: 14,
    lineHeight: 18,
    color: '#262626',
  },
  username: {
    fontWeight: '700',
    color: '#262626',
  },
  preview: {
    fontWeight: '400',
    color: '#262626',
  },
  appThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DBDBDB',
  },
});
