import { Camera, User } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type ProfileAvatarProps = {
  avatarUrl: string | null;
  size?: number;
  onPress?: () => void;
  busy?: boolean;
  showEditHint?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ProfileAvatar({
  avatarUrl,
  size = 40,
  onPress,
  busy = false,
  showEditHint = false,
  accessibilityLabel = 'Профайл зураг',
  style,
}: ProfileAvatarProps) {
  const iconSize = Math.round(size * 0.45);
  const badgeSize = Math.round(size * 0.32);

  const content = (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-vinyl-divider"
      style={[{ width: size, height: size }, style]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <User size={iconSize} color="#0A0A0A" />
      )}
      {busy ? (
        <View
          className="absolute inset-0 items-center justify-center bg-black/40"
          accessibilityElementsHidden
        >
          <ActivityIndicator color="#FFFFFF" size="small" />
        </View>
      ) : null}
      {showEditHint && !busy ? (
        <View
          className="absolute bottom-0 right-0 items-center justify-center rounded-full border-2 border-vinyl-paper bg-vinyl-black"
          style={{ width: badgeSize, height: badgeSize }}
        >
          <Camera size={Math.round(badgeSize * 0.55)} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: busy, busy }}
      hitSlop={8}
    >
      {content}
    </Pressable>
  );
}
