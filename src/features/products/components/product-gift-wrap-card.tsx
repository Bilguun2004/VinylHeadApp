import { Gift } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { OptionToggle } from './option-toggle';

const FALLBACK_WRAP_IMAGE =
  'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=200&q=80';

export type GiftWrapOption = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type GiftWrapSelection = {
  enabled: boolean;
  optionId: string | null;
};

type ProductGiftWrapCardProps = {
  extraPriceLabel: string;
  options: GiftWrapOption[];
  optionsLoading?: boolean;
  defaultEnabled?: boolean;
  selection?: GiftWrapSelection;
  onSelectionChange?: (next: GiftWrapSelection) => void;
};

function formatExtraPrice(amount: number) {
  if (amount <= 0) return 'Үнэгүй';
  return `Нэмэлт ₮${Math.round(amount).toLocaleString('en-US')}`;
}

export function ProductGiftWrapCard({
  extraPriceLabel,
  options,
  optionsLoading = false,
  defaultEnabled = false,
  selection,
  onSelectionChange,
}: ProductGiftWrapCardProps) {
  const [internalEnabled, setInternalEnabled] = useState(defaultEnabled);
  const [internalOptionId, setInternalOptionId] = useState<string | null>(null);

  const controlled = selection != null && onSelectionChange != null;
  const enabled = controlled ? selection.enabled : internalEnabled;
  const selectedId = controlled ? selection.optionId : internalOptionId;

  const setEnabled = (next: boolean) => {
    if (controlled) {
      onSelectionChange({ enabled: next, optionId: selectedId });
    } else {
      setInternalEnabled(next);
    }
  };

  const setSelectedId = (next: string | null) => {
    if (controlled) {
      onSelectionChange({ enabled, optionId: next });
    } else {
      setInternalOptionId(next);
    }
  };

  useEffect(() => {
    if (options.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId == null || !options.some((o) => o.id === selectedId)) {
      setSelectedId(options[0].id);
    }
  }, [options, selectedId]);

  const selected = options.find((o) => o.id === selectedId) ?? options[0];

  return (
    <View className="rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row pr-3">
          <Gift size={20} color="#0A0A0A" />
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-vinyl-black">
              Бэлгийн боодол
            </Text>
            <Text className="mt-0.5 text-xs text-vinyl-muted">
              {extraPriceLabel}
            </Text>
          </View>
        </View>
        <OptionToggle
          value={enabled}
          onValueChange={setEnabled}
          accessibilityLabel="Бэлгийн боодол идэвхжүүлэх"
        />
      </View>

      {enabled ? (
        <>
          <View className="my-4 h-px bg-vinyl-divider" />
          {optionsLoading ? (
            <View className="items-center py-2">
              <ActivityIndicator />
            </View>
          ) : options.length === 0 ? (
            <Text className="text-xs text-vinyl-muted">
              Одоогоор бэлэн боодол байхгүй.
            </Text>
          ) : (
            <>
              <Text className="text-xs text-vinyl-muted">
                Цаасны сонголт:{' '}
                <Text className="font-medium text-vinyl-black">
                  {selected?.name ?? ''}
                </Text>
              </Text>
              <View className="mt-4 flex-row flex-wrap">
                {options.map((option) => {
                  const active = option.id === selectedId;
                  const uri = option.imageUrl?.trim() || FALLBACK_WRAP_IMAGE;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setSelectedId(option.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${option.name} боодол`}
                      accessibilityState={{ selected: active }}
                      className="mb-2 mr-4 items-center"
                    >
                      <View
                        className={`h-10 w-10 items-center justify-center overflow-hidden rounded-full ${
                          active ? 'border-2 border-vinyl-black' : 'border border-vinyl-divider'
                        }`}
                      >
                        <Image
                          source={{ uri }}
                          className="h-8 w-8 rounded-full"
                          resizeMode="cover"
                          accessibilityIgnoresInvertColors
                        />
                      </View>
                      <Text
                        className={`mt-1.5 max-w-[72px] text-center text-[10px] ${
                          active
                            ? 'font-medium text-vinyl-black'
                            : 'text-vinyl-muted'
                        }`}
                        numberOfLines={2}
                      >
                        {option.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </>
      ) : null}
    </View>
  );
}

export { formatExtraPrice };
