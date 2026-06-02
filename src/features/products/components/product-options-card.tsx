import { Palette } from 'lucide-react-native';
import { useEffect } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import type { ProductOptionValue } from '../lib/product-options';

const FALLBACK_SWATCH =
  'https://images.unsplash.com/photo-1560507074-b9eb43a0c9a4?auto=format&fit=crop&w=200&q=80';

export type ProductOptionSelection = {
  optionId: string | null;
};

type ProductOptionsCardProps = {
  label: string;
  options: ProductOptionValue[];
  selection: ProductOptionSelection;
  onSelectionChange: (next: ProductOptionSelection) => void;
};

export function ProductOptionsCard({
  label,
  options,
  selection,
  onSelectionChange,
}: ProductOptionsCardProps) {
  const selectedId = selection.optionId;
  const selectable = options.filter((o) => o.available);
  const selected =
    options.find((o) => o.id === selectedId) ??
    selectable[0] ??
    options[0] ??
    null;

  useEffect(() => {
    if (selectable.length === 0) {
      if (selectedId != null) {
        onSelectionChange({ optionId: null });
      }
      return;
    }
    if (
      selectedId == null ||
      !selectable.some((o) => o.id === selectedId)
    ) {
      onSelectionChange({ optionId: selectable[0].id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when options load
  }, [options, selectable, selectedId]);

  if (options.length === 0) return null;

  return (
    <View className="rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row items-start">
        <Palette size={20} color="#0A0A0A" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-vinyl-black">{label}</Text>
          <Text className="mt-0.5 text-xs text-vinyl-muted">
            Сонголт:{' '}
            <Text className="font-medium text-vinyl-black">
              {selected?.label ?? '—'}
            </Text>
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap">
        {options.map((option) => {
          const active = option.id === selectedId;
          const disabled = !option.available;
          const swatchUri = option.imageUrl?.trim() || FALLBACK_SWATCH;

          return (
            <Pressable
              key={option.id}
              onPress={() => {
                if (!disabled) onSelectionChange({ optionId: option.id });
              }}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: active, disabled }}
              className={`mb-2 mr-4 items-center ${disabled ? 'opacity-40' : ''}`}
            >
              <View
                className={`h-12 w-12 items-center justify-center overflow-hidden rounded-full ${
                  active
                    ? 'border-2 border-vinyl-black'
                    : 'border border-vinyl-divider'
                }`}
              >
                <Image
                  source={{ uri: swatchUri }}
                  className="h-10 w-10 rounded-full"
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              </View>
              <Text
                className={`mt-1.5 max-w-[80px] text-center text-[10px] ${
                  active
                    ? 'font-medium text-vinyl-black'
                    : 'text-vinyl-muted'
                }`}
                numberOfLines={2}
              >
                {option.label}
              </Text>
              {disabled ? (
                <Text className="mt-0.5 text-[9px] text-vinyl-muted">Дууссан</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
