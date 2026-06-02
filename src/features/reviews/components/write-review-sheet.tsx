import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateReviewMutation } from '../api/use-create-review-mutation';
import { StarRating } from './star-rating';

const MAX_IMAGES = 3;

type WriteReviewSheetProps = {
  visible: boolean;
  productId: string;
  userId: string;
  authorDisplayName: string;
  authorAvatarUrl?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
};

export function WriteReviewSheet({
  visible,
  productId,
  userId,
  authorDisplayName,
  authorAvatarUrl,
  onClose,
  onSuccess,
}: WriteReviewSheetProps) {
  const insets = useSafeAreaInsets();
  const createMutation = useCreateReviewMutation();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [localImages, setLocalImages] = useState<string[]>([]);

  const reset = () => {
    setRating(5);
    setComment('');
    setLocalImages([]);
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    reset();
    onClose();
  };

  const pickImages = async () => {
    if (localImages.length >= MAX_IMAGES) {
      Alert.alert('Анхаар', `Хамгийн ихдээ ${MAX_IMAGES} зураг оруулна.`);
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - localImages.length,
    });
    if (res.canceled) return;
    const uris = (res.assets ?? []).map((a) => a.uri).filter(Boolean) as string[];
    setLocalImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
  };

  const handleSubmit = () => {
    if (rating < 1) {
      Alert.alert('Анхаар', 'Од сонгоно уу.');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Анхаар', 'Сэтгэгдэл бичнэ үү.');
      return;
    }

    createMutation.mutate(
      {
        productId,
        userId,
        authorDisplayName,
        authorAvatarUrl,
        rating,
        comment: comment.trim(),
        localImageUris: localImages,
      },
      {
        onSuccess: () => {
          Alert.alert('Амжилттай', 'Сэтгэгдэл нийтлэгдлээ.');
          reset();
          onClose();
          onSuccess?.();
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Сэтгэгдэл илгээхэд алдаа гарлаа.';
          Alert.alert('Алдаа', message);
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-vinyl-paper"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center justify-between border-b border-vinyl-divider px-4 py-3">
          <Text className="text-lg font-semibold text-vinyl-black">Сэтгэгдэл бичих</Text>
          <Pressable
            onPress={handleClose}
            disabled={createMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Хаах"
            hitSlop={8}
          >
            <X size={22} color="#0A0A0A" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-sm font-semibold text-vinyl-black">Үнэлгээ</Text>
          <View className="mt-2">
            <StarRating
              rating={rating}
              size={28}
              interactive
              onRatingChange={setRating}
            />
          </View>

          <Text className="mt-6 text-sm font-semibold text-vinyl-black">Сэтгэгдэл</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Таны сэтгэгдэл..."
            placeholderTextColor="#A1A1A1"
            multiline
            textAlignVertical="top"
            editable={!createMutation.isPending}
            className="mt-2 min-h-[120px] rounded-2xl border border-vinyl-divider bg-white px-4 py-3 text-base text-vinyl-black"
          />

          <Text className="mt-6 text-sm font-semibold text-vinyl-black">
            Зураг (заавал биш)
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {localImages.map((uri) => (
              <View key={uri} className="relative">
                <Image source={{ uri }} className="h-20 w-20 rounded-xl" resizeMode="cover" />
                <Pressable
                  onPress={() => setLocalImages((prev) => prev.filter((u) => u !== uri))}
                  className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-vinyl-black"
                  accessibilityRole="button"
                  accessibilityLabel="Зураг устгах"
                >
                  <X size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {localImages.length < MAX_IMAGES ? (
              <Pressable
                onPress={() => void pickImages()}
                disabled={createMutation.isPending}
                className="h-20 w-20 items-center justify-center rounded-xl border border-dashed border-vinyl-divider bg-white"
                accessibilityRole="button"
                accessibilityLabel="Зураг нэмэх"
              >
                <ImagePlus size={24} color="#6B6B6B" />
              </Pressable>
            ) : null}
          </View>
        </ScrollView>

        <View
          className="border-t border-vinyl-divider px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Pressable
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            className={`h-12 items-center justify-center rounded-2xl ${
              createMutation.isPending ? 'bg-vinyl-black/60' : 'bg-vinyl-black'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Илгээх"
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-semibold text-white">Илгээх</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
