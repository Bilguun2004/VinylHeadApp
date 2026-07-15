import { ScrollView, Text, Pressable, View } from 'react-native';

import {
  getInstagramStoryFontFamily,
  INSTAGRAM_STORY_FONTS,
  type InstagramStoryFontId,
} from '../lib/instagram-story-fonts';

type LaserFontPickerProps = {
  printText: string;
  selectedFontId: InstagramStoryFontId;
  onFontChange: (fontId: InstagramStoryFontId) => void;
};

export function LaserFontPicker({
  printText,
  selectedFontId,
  onFontChange,
}: LaserFontPickerProps) {
  const trimmed = printText.trim();
  if (!trimmed) return null;

  const previewFamily = getInstagramStoryFontFamily(selectedFontId);

  return (
    <View className="mt-3">
      <Text className="mb-2 text-xs text-vinyl-muted">Фонтын урьдчилсан харагдах байдал</Text>
      <View className="items-center justify-center rounded-2xl border border-vinyl-black/20 bg-vinyl-surface px-4 py-6">
        <Text
          style={{ fontFamily: previewFamily, fontSize: 28 }}
          className="text-center text-vinyl-black"
          numberOfLines={2}
        >
          {trimmed}
        </Text>
      </View>

      <Text className="mb-2 mt-4 text-xs text-vinyl-muted">Фонт сонгох</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-1"
      >
        {INSTAGRAM_STORY_FONTS.map((font) => {
          const selected = font.id === selectedFontId;
          return (
            <Pressable
              key={font.id}
              onPress={() => onFontChange(font.id)}
              accessibilityRole="button"
              accessibilityLabel={`${font.label} фонт`}
              accessibilityState={{ selected }}
              className={`rounded-xl border px-3 py-2 ${
                selected
                  ? 'border-vinyl-black bg-vinyl-black'
                  : 'border-vinyl-black/20 bg-white'
              }`}
            >
              <Text
                style={{ fontFamily: font.family, fontSize: 16 }}
                className={selected ? 'text-vinyl-paper' : 'text-vinyl-black'}
              >
                {font.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
