import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatMnt } from '../lib/format-mnt';

export type PaymentMethodId = 'qpay' | 'storepay';

type CheckoutPaymentSectionProps = {
  total: number;
  selectedMethod: PaymentMethodId;
  onSelectMethod: (method: PaymentMethodId) => void;
  disabled?: boolean;
};

function QPayMark() {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-lg bg-[#2B6BE6]">
      <Text className="text-lg font-bold text-white">Q</Text>
    </View>
  );
}

function StorePayMark() {
  return (
    <View className="h-10 items-center justify-center rounded-lg bg-[#1A1A1A] px-2.5">
      <Text className="text-[11px] font-bold lowercase tracking-tight text-white">
        store
        <Text className="font-normal text-[#7DD3FC]">pay</Text>
      </Text>
    </View>
  );
}

type PaymentOptionRowProps = {
  label: string;
  icon: ReactNode;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

function PaymentOptionRow({
  label,
  icon,
  selected,
  onPress,
  disabled,
}: PaymentOptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={label}
      className={`flex-row items-center rounded-xl px-3 py-3 ${
        selected ? 'bg-vinyl-surface' : 'bg-white'
      }`}
    >
      {icon}
      <Text className="ml-3 flex-1 text-base font-semibold text-vinyl-black">
        {label}
      </Text>
      <View
        className={`h-6 w-6 items-center justify-center rounded-full ${
          selected ? 'bg-vinyl-black' : 'border-2 border-vinyl-divider bg-white'
        }`}
      >
        {selected ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

export function CheckoutPaymentSection({
  total,
  selectedMethod,
  onSelectMethod,
  disabled,
}: CheckoutPaymentSectionProps) {
  return (
    <View>
      <Text className="font-serif text-2xl text-vinyl-black">Төлбөр</Text>

      <View className="mt-4 overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
        <Text className="text-sm text-vinyl-muted">Төлбөрийн хэрэгсэл</Text>

        <View className="mt-3 gap-2">
          <PaymentOptionRow
            label="QPay"
            icon={<QPayMark />}
            selected={selectedMethod === 'qpay'}
            onPress={() => onSelectMethod('qpay')}
            disabled={disabled}
          />
          <PaymentOptionRow
            label="StorePay"
            icon={<StorePayMark />}
            selected={selectedMethod === 'storepay'}
            onPress={() => onSelectMethod('storepay')}
            disabled={disabled}
          />
        </View>

        <View className="mt-4 flex-row items-center justify-between border-t border-vinyl-divider pt-4">
          <Text className="text-sm text-vinyl-muted">Төлөх дүн</Text>
          <Text className="text-lg font-bold text-vinyl-black">
            {formatMnt(total)}
          </Text>
        </View>
      </View>
    </View>
  );
}
