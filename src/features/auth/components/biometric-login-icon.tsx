import { Fingerprint, ScanFace } from 'lucide-react-native';

import type { BiometricKind } from '../lib/biometric-auth';

export type BiometricLoginIconProps = {
  kind: BiometricKind;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function BiometricLoginIcon({
  kind,
  size = 20,
  color = '#1A1A1A',
  strokeWidth = 2,
}: BiometricLoginIconProps) {
  if (kind === 'face') {
    return (
      <ScanFace
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        accessibilityLabel="Face ID"
      />
    );
  }

  return (
    <Fingerprint
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      accessibilityLabel="Хурууны хээ"
    />
  );
}
