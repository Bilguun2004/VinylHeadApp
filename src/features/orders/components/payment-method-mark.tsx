import { Text, View } from 'react-native';

import { QPayLogo } from '../../../components/qpay-logo';

type PaymentMethodMarkProps = {
  method: string | null | undefined;
  size?: 'sm' | 'md';
};

export function PaymentMethodMark({
  method,
  size = 'sm',
}: PaymentMethodMarkProps) {
  const m = method?.trim().toLowerCase() ?? '';

  if (m === 'qpay') {
    const width = size === 'md' ? 88 : 72;
    const height = size === 'md' ? 28 : 24;
    return (
      <View className="items-center justify-center rounded-md bg-white px-1.5 py-1">
        <QPayLogo width={width} height={height} />
      </View>
    );
  }

  if (m === 'storepay') {
    return (
      <View className="h-8 items-center justify-center rounded-md bg-vinyl-black px-1.5">
        <Text className="text-[9px] font-bold lowercase text-white">
          storepay
        </Text>
      </View>
    );
  }

  return null;
}
