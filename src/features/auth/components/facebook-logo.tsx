import Svg, { Path, type SvgProps } from 'react-native-svg';

// Lucide v1.x dropped brand icons, so we draw the Facebook "f" mark
// ourselves. Keep this colocated with the auth feature — it's the only
// place we render Facebook branding right now.
export type FacebookLogoProps = {
  size?: number;
  color?: string;
} & Omit<SvgProps, 'width' | 'height'>;

export function FacebookLogo({
  size = 20,
  color = '#FFFFFF',
  ...rest
}: FacebookLogoProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      accessibilityRole="image"
      accessibilityLabel="Facebook"
      {...rest}
    >
      <Path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.99 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.493-3.89 3.776-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.772-1.63 1.563V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.99 22 12Z" />
    </Svg>
  );
}
