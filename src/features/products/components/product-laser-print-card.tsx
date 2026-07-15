import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Printer } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';

import {
  DEFAULT_INSTAGRAM_STORY_FONT_ID,
  type InstagramStoryFontId,
} from '../lib/instagram-story-fonts';
import { LaserFontPicker } from './laser-font-picker';
import { OptionToggle } from './option-toggle';

const MAX_PRINT_TEXT_LENGTH = 40;
const MAX_NOTE_LENGTH = 200;

const fieldInputClass =
  'rounded-xl border border-vinyl-black/20 bg-vinyl-surface px-3 py-2.5 text-base text-vinyl-black';

export type LaserPrintSelection = {
  enabled: boolean;
  imageUri: string | null;
  printText: string;
  printFont: InstagramStoryFontId;
  note: string;
};

export const EMPTY_LASER_PRINT_SELECTION: LaserPrintSelection = {
  enabled: false,
  imageUri: null,
  printText: '',
  printFont: DEFAULT_INSTAGRAM_STORY_FONT_ID,
  note: '',
};

type ProductLaserPrintCardProps = {
  extraPriceLabel: string;
  selection?: LaserPrintSelection;
  onSelectionChange?: (next: LaserPrintSelection) => void;
};

export function ProductLaserPrintCard({
  extraPriceLabel,
  selection,
  onSelectionChange,
}: ProductLaserPrintCardProps) {
  const [internal, setInternal] = useState<LaserPrintSelection>(
    EMPTY_LASER_PRINT_SELECTION,
  );

  const controlled = selection != null && onSelectionChange != null;
  const current = controlled ? selection : internal;

  const patch = (partial: Partial<LaserPrintSelection>) => {
    const next = { ...current, ...partial };
    if (controlled) {
      onSelectionChange(next);
    } else {
      setInternal(next);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Зөвшөөрөл шаардлагатай',
        'Зураг сонгохын тулд галерейд хандах зөвшөөрөл өгнө үү.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      patch({ imageUri: result.assets[0].uri });
    }
  };

  return (
    <View className="rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row pr-3">
          <Printer size={20} color="#0A0A0A" />
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-vinyl-black">
              Лазер хэвлэл
            </Text>
            <Text className="mt-0.5 text-xs text-vinyl-muted">
              {extraPriceLabel}
            </Text>
          </View>
        </View>
        <OptionToggle
          value={current.enabled}
          onValueChange={(enabled) => patch({ enabled })}
          accessibilityLabel="Лазер хэвлэл идэвхжүүлэх"
        />
      </View>

      {current.enabled ? (
        <>
          <Text className="mt-3 text-xs leading-5 text-vinyl-muted">
            Өөрийн зургаа ачаалж, пянз тоглуулагч дээрээ хэвлүүлж аваарай
          </Text>

          <Text className="mb-2 mt-4 text-xs text-vinyl-muted">
            Хэвлэх үг
          </Text>
          <TextInput
            value={current.printText}
            onChangeText={(printText) =>
              patch({ printText: printText.slice(0, MAX_PRINT_TEXT_LENGTH) })
            }
            placeholder="Жишээ нь: VinylHead"
            placeholderTextColor="#A1A1A1"
            maxLength={MAX_PRINT_TEXT_LENGTH}
            className={fieldInputClass}
            accessibilityLabel="Хэвлэх үг"
          />

          <LaserFontPicker
            printText={current.printText}
            selectedFontId={current.printFont}
            onFontChange={(printFont) => patch({ printFont })}
          />

          <Pressable
            onPress={pickImage}
            accessibilityRole="button"
            accessibilityLabel="Зураг оруулах"
            className="mt-4 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-vinyl-black/40 bg-vinyl-surface py-10"
          >
            {current.imageUri ? (
              <Image
                source={{ uri: current.imageUri }}
                style={{ width: '100%', height: 160 }}
                resizeMode="cover"
                accessibilityLabel="Сонгосон зураг"
              />
            ) : (
              <>
                <ImagePlus size={24} color="#6B6B6B" />
                <Text className="mt-2 text-sm font-medium text-vinyl-muted">
                  Зураг оруулах
                </Text>
              </>
            )}
          </Pressable>

          <Text className="mb-2 mt-4 text-xs text-vinyl-muted">
            Нэмэлт тэмдэглэл
          </Text>
          <TextInput
            value={current.note}
            onChangeText={(note) =>
              patch({ note: note.slice(0, MAX_NOTE_LENGTH) })
            }
            placeholder="Зурагтай хамт хэвлэх нэмэлт тайлбар..."
            placeholderTextColor="#A1A1A1"
            multiline
            maxLength={MAX_NOTE_LENGTH}
            className={`${fieldInputClass} min-h-[72px]`}
            accessibilityLabel="Нэмэлт тэмдэглэл"
            textAlignVertical="top"
          />
        </>
      ) : null}
    </View>
  );
}
