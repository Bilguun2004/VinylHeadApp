import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { QPayLogo } from '../../../components/qpay-logo';

import { formatMnt } from '../lib/format-mnt';

export type PaymentMethodId = 'qpay';

type CheckoutPaymentSectionProps = {
  total: number;
  selectedMethod: PaymentMethodId | null;
  onSelectMethod: (method: PaymentMethodId) => void;
  disabled?: boolean;
};

const PAYMENT_METHODS: {
  id: PaymentMethodId;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
}[] = [
  {
    id: 'qpay',
    title: 'QPay',
    subtitle: 'Банкны апп-аар шууд төлөх',
    accessibilityLabel: 'QPay төлбөрийн хэрэгсэл сонгох',
  },
];

export function CheckoutPaymentSection({
  total,
  selectedMethod,
  onSelectMethod,
  disabled = false,
}: CheckoutPaymentSectionProps) {
  return (
    <View>
      <Text className="font-serif text-2xl text-vinyl-black">Төлбөр</Text>
      <Text className="mt-1 text-sm text-vinyl-muted">
        Төлбөрийн хэрэгсэлээ сонгоно уу
      </Text>

      <View className="mt-4 overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
        <View className="gap-3">
          {PAYMENT_METHODS.map((method) => {
            const selected = selectedMethod === method.id;
            return (
              <Pressable
                key={method.id}
                onPress={() => onSelectMethod(method.id)}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={method.accessibilityLabel}
                className={`overflow-hidden rounded-2xl border-2 ${
                  selected
                    ? 'border-vinyl-black bg-vinyl-canvas'
                    : 'border-vinyl-divider bg-vinyl-surface'
                }`}
              >
                <View className="flex-row items-center px-4 py-4">
                  <View className="h-14 w-[108px] items-center justify-center rounded-xl bg-white px-2">
                    <QPayLogo width={96} height={32} />
                  </View>

                  <View className="ml-3 flex-1 pr-2">
                    <Text className="text-base font-semibold text-vinyl-black">
                      {method.title}
                    </Text>
                    <Text className="mt-0.5 text-xs text-vinyl-muted">
                      {method.subtitle}
                    </Text>
                  </View>

                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${
                      selected
                        ? 'bg-vinyl-black'
                        : 'border border-vinyl-divider bg-white'
                    }`}
                  >
                    {selected ? (
                      <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {!selectedMethod ? (
          <Text className="mt-3 text-xs text-vinyl-muted">
            Захиалга үргэлжлүүлэхийн тулд дээрхээс сонгоно уу
          </Text>
        ) : null}

        <View className="mt-4 rounded-xl bg-vinyl-canvas px-4 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-vinyl-muted">Төлөх дүн</Text>
            <Text className="text-lg font-bold text-vinyl-black">
              {formatMnt(total)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
