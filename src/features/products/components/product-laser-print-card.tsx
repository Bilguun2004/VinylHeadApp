import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Printer } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { OptionToggle } from './option-toggle';

export type LaserPrintSelection = {
  enabled: boolean;
  imageUri: string | null;
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
  const [internalEnabled, setInternalEnabled] = useState(false);
  const [internalUri, setInternalUri] = useState<string | null>(null);

  const controlled = selection != null && onSelectionChange != null;
  const enabled = controlled ? selection.enabled : internalEnabled;
  const previewUri = controlled ? selection.imageUri : internalUri;

  const setEnabled = (next: boolean) => {
    if (controlled) {
      onSelectionChange({ enabled: next, imageUri: previewUri });
    } else {
      setInternalEnabled(next);
    }
  };

  const setPreviewUri = (next: string | null) => {
    if (controlled) {
      onSelectionChange({ enabled, imageUri: next });
    } else {
      setInternalUri(next);
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
      setPreviewUri(result.assets[0].uri);
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
          value={enabled}
          onValueChange={setEnabled}
          accessibilityLabel="Лазер хэвлэл идэвхжүүлэх"
        />
      </View>

      {enabled ? (
        <>
          <Text className="mt-3 text-xs leading-5 text-vinyl-muted">
            Өөрийн зургаа ачаалж, пянз тоглуулагч дээрээ хэвлүүлж аваарай
          </Text>
          <Pressable
            onPress={pickImage}
            accessibilityRole="button"
            accessibilityLabel="Зураг оруулах"
            className="mt-3 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-vinyl-black/40 bg-vinyl-surface py-10"
          >
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
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
        </>
      ) : null}
    </View>
  );
}
