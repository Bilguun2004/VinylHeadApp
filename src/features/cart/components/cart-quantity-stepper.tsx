import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type CartQuantityStepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
};

export function CartQuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: CartQuantityStepperProps) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View className="flex-row items-center rounded-lg border border-vinyl-divider bg-vinyl-surface">
      <Pressable
        onPress={() => canDecrease && onChange(value - 1)}
        disabled={!canDecrease}
        accessibilityRole="button"
        accessibilityLabel="Хэмжээ багасгах"
        className="h-8 w-8 items-center justify-center"
      >
        <Minus
          size={16}
          color={canDecrease ? '#0A0A0A' : '#A1A1A1'}
          strokeWidth={2.5}
        />
      </Pressable>
      <Text className="min-w-[24px] text-center text-sm font-semibold text-vinyl-black">
        {value}
      </Text>
      <Pressable
        onPress={() => canIncrease && onChange(value + 1)}
        disabled={!canIncrease}
        accessibilityRole="button"
        accessibilityLabel="Хэмжээ нэмэх"
        className="h-8 w-8 items-center justify-center"
      >
        <Plus
          size={16}
          color={canIncrease ? '#0A0A0A' : '#A1A1A1'}
          strokeWidth={2.5}
        />
      </Pressable>
    </View>
  );
}
