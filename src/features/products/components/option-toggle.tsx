import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

type OptionToggleProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
};

export function OptionToggle({
  value,
  onValueChange,
  accessibilityLabel,
}: OptionToggleProps) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      className={`h-7 w-12 flex-row items-center rounded-full px-0.5 ${
        value ? 'bg-vinyl-black' : 'bg-vinyl-divider'
      }`}
    >
      <View
        className={`h-6 w-6 items-center justify-center rounded-full ${
          value ? 'ml-auto bg-[#2B6BE6]' : 'bg-white'
        }`}
      >
        {value ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}
