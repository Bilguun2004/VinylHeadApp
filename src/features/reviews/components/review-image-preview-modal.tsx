import { X } from 'lucide-react-native';
import { Image, Modal, Pressable, View } from 'react-native';

type ReviewImagePreviewModalProps = {
  imageUrl: string | null;
  visible: boolean;
  onClose: () => void;
};

export function ReviewImagePreviewModal({
  imageUrl,
  visible,
  onClose,
}: ReviewImagePreviewModalProps) {
  if (!imageUrl) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/90">
        <View className="flex-row items-center justify-end px-4 pb-3 pt-12">
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Хаах"
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15"
          >
            <X size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Зураг хаах"
          className="flex-1 items-center justify-center px-4 pb-8"
        >
          <Image
            source={{ uri: imageUrl }}
            className="h-full w-full rounded-2xl"
            resizeMode="contain"
            accessibilityLabel="Review image preview"
          />
        </Pressable>
      </View>
    </Modal>
  );
}
