import { Image, type ImageStyle, type StyleProp } from 'react-native';

type QPayLogoProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
};

export function QPayLogo({ width = 72, height = 24, style }: QPayLogoProps) {
  return (
    <Image
      source={require('../../assets/qpay-logo.png')}
      style={[{ width, height }, style]}
      resizeMode="contain"
      accessibilityLabel="Qpay Logo"
      accessibilityIgnoresInvertColors
    />
  );
}
