import { Palette, Plus, X } from 'lucide-react-native';
import {
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { ProductImageSlot } from '../api/use-create-product-mutation';
import {
  clampOptionDraftImageIndices,
  newOptionDraft,
  type ProductOptionDraft,
} from '../../products/lib/product-options';

type AdminProductOptionsEditorProps = {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  label: string;
  onLabelChange: (next: string) => void;
  drafts: ProductOptionDraft[];
  onDraftsChange: (next: ProductOptionDraft[]) => void;
  imageSlots: ProductImageSlot[];
  slotUri: (slot: ProductImageSlot) => string;
};

export function AdminProductOptionsEditor({
  enabled,
  onEnabledChange,
  label,
  onLabelChange,
  drafts,
  onDraftsChange,
  imageSlots,
  slotUri,
}: AdminProductOptionsEditorProps) {
  const updateDraft = (index: number, patch: Partial<ProductOptionDraft>) => {
    onDraftsChange(
      drafts.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  };

  const removeDraft = (index: number) => {
    const next =
      drafts.length <= 1
        ? [newOptionDraft()]
        : drafts.filter((_, i) => i !== index);
    onDraftsChange(clampOptionDraftImageIndices(next, imageSlots.length));
  };

  return (
    <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row items-center justify-between overflow-hidden">
        <View className="min-w-0 flex-1 flex-row items-center pr-3">
          <Palette size={18} color="#0A0A0A" />
          <Text className="ml-3 shrink text-sm text-vinyl-black">
            Өнгө / сонголт идэвхжүүлэх
          </Text>
        </View>
        <View className="shrink-0">
          <Switch
            value={enabled}
            onValueChange={(next) => {
              onEnabledChange(next);
              if (next && drafts.length === 0) {
                onDraftsChange([newOptionDraft()]);
              }
            }}
            accessibilityLabel="Өнгө / сонголт идэвхжүүлэх"
          />
        </View>
      </View>

      {enabled ? (
        <>
          <Text className="mt-4 text-xs text-vinyl-muted">
            Сонголтын нэр (жишээ: Өнгө, Хэмжээ)
          </Text>
          <TextInput
            value={label}
            onChangeText={onLabelChange}
            placeholder="Өнгө"
            placeholderTextColor="#A1A1A1"
            className="mt-2 rounded-xl border border-vinyl-divider px-3 py-3 text-sm text-vinyl-black"
            accessibilityLabel="Сонголтын нэр"
          />

          <Text className="mt-4 text-xs text-vinyl-muted">
            Утгууд — зураг холбож хэрэглэгчид өнгийг харуулна
          </Text>

          {imageSlots.length === 0 ? (
            <Text className="mt-2 text-xs text-vinyl-muted">
              Эхлээд дээрээс бүтээгдэхүүний зураг оруулна уу.
            </Text>
          ) : null}

          {drafts.map((draft, index) => (
            <View
              key={draft.id}
              className="mt-3 rounded-xl border border-vinyl-divider p-3"
            >
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={draft.label}
                  onChangeText={(text) => updateDraft(index, { label: text })}
                  placeholder={`Сонголт ${index + 1}`}
                  placeholderTextColor="#A1A1A1"
                  className="flex-1 rounded-xl border border-vinyl-divider px-3 py-2.5 text-sm text-vinyl-black"
                  accessibilityLabel={`Сонголт ${index + 1}`}
                />
                <Pressable
                  onPress={() => removeDraft(index)}
                  accessibilityRole="button"
                  accessibilityLabel="Сонголт устгах"
                  hitSlop={8}
                  className="h-10 w-10 items-center justify-center"
                >
                  <X size={18} color="#6B6B6B" />
                </Pressable>
              </View>

              <View className="mt-3 flex-row items-center justify-between overflow-hidden">
                <Text className="min-w-0 flex-1 shrink pr-3 text-xs text-vinyl-muted">
                  Боломжтой
                </Text>
                <View className="shrink-0">
                  <Switch
                    value={draft.available}
                    onValueChange={(next) => updateDraft(index, { available: next })}
                    accessibilityLabel={`${draft.label || 'Сонголт'} боломжтой`}
                  />
                </View>
              </View>

              <Text className="mt-3 text-xs text-vinyl-muted">Зураг сонгох</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-2"
                contentContainerStyle={{ paddingVertical: 2 }}
              >
                {imageSlots.map((slot, slotIndex) => {
                  const uri = slotUri(slot);
                  const selected = draft.imageIndex === slotIndex;
                  return (
                    <Pressable
                      key={`${draft.id}-img-${slotIndex}`}
                      onPress={() =>
                        updateDraft(index, {
                          imageIndex: selected ? null : slotIndex,
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Зураг ${slotIndex + 1}`}
                      accessibilityState={{ selected }}
                      className={`mr-2 overflow-hidden rounded-xl ${
                        selected
                          ? 'border-2 border-vinyl-black'
                          : 'border border-vinyl-divider'
                      }`}
                    >
                      <Image
                        source={{ uri }}
                        className="h-16 w-16"
                        resizeMode="cover"
                        accessibilityIgnoresInvertColors
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ))}

          <Pressable
            onPress={() => onDraftsChange([...drafts, newOptionDraft()])}
            accessibilityRole="button"
            accessibilityLabel="Сонголт нэмэх"
            className="mt-3 flex-row items-center self-start rounded-full border border-vinyl-divider px-3 py-2"
          >
            <Plus size={16} color="#0A0A0A" />
            <Text className="ml-1.5 text-sm font-medium text-vinyl-black">
              Сонголт нэмэх
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
