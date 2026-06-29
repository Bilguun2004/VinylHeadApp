import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { OptionToggle } from '../../products/components/option-toggle';
import { useAdminGiftOptionsQuery } from '../api/use-admin-gift-options-query';
import type { AdminGiftOptionRow } from '../api/use-admin-gift-options-query';
import { useCreateGiftOptionMutation } from '../api/use-create-gift-option-mutation';
import { useUpdateGiftOptionMutation } from '../api/use-update-gift-option-mutation';

const FALLBACK_WRAP_IMAGE =
  'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80';

type GiftCardProps = {
  item: AdminGiftOptionRow;
  onToggle: (id: string, next: boolean) => void;
};

function AdminGiftOptionCard({ item, onToggle }: GiftCardProps) {
  const imageUri = item.image_url?.trim() || FALLBACK_WRAP_IMAGE;
  const statusLabel = item.is_available ? 'Бэлэн' : 'Дууссан';

  return (
    <View className="mb-3 flex-1 rounded-2xl bg-white p-3 shadow-sm">
      <Image
        source={{ uri: imageUri }}
        className="h-28 w-full rounded-xl"
        resizeMode="cover"
        accessibilityLabel={item.name}
      />
      <Text
        className="mt-3 font-normal text-base font-semibold text-vinyl-black"
        numberOfLines={2}
      >
        {item.name}
      </Text>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-xs text-vinyl-muted">{statusLabel}</Text>
        <OptionToggle
          value={item.is_available}
          onValueChange={(next) => onToggle(item.id, next)}
          accessibilityLabel={`${item.name} бэлэн байдал`}
        />
      </View>
    </View>
  );
}

type AddGiftModalProps = {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (name: string, localImageUri?: string) => void;
};

function AddGiftOptionModal({
  visible,
  busy,
  onClose,
  onConfirm,
}: AddGiftModalProps) {
  const [name, setName] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setName('');
      setLocalImageUri(undefined);
    }
  }, [visible]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Зөвшөөрөл', 'Зургийн сан руу нэвтрэх эрх шаардлагатай.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center bg-black/40 px-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Хаах"
          onPress={onClose}
          className="absolute inset-0"
        />
        <View className="rounded-2xl bg-white px-5 py-5" accessibilityViewIsModal>
          <Text className="text-center text-base font-semibold text-vinyl-black">
            Шинэ боодол
          </Text>
          <Pressable
            onPress={pickImage}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Зураг сонгох"
            className="mt-4 h-36 items-center justify-center overflow-hidden rounded-xl border border-dashed border-vinyl-divider bg-vinyl-surface"
          >
            {localImageUri ? (
              <Image
                source={{ uri: localImageUri }}
                className="h-full w-full"
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <>
                <ImagePlus size={28} color="#6B6B6B" />
                <Text className="mt-2 text-xs text-vinyl-muted">Зураг нэмэх</Text>
              </>
            )}
          </Pressable>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Боодлын нэр"
            placeholderTextColor="#A1A1A1"
            autoFocus
            editable={!busy}
            className="mt-4 rounded-xl border border-vinyl-divider px-3 py-3 text-sm text-vinyl-black"
            accessibilityLabel="Боодлын нэр"
          />
          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={onClose}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Цуцлах"
              className="h-12 flex-1 items-center justify-center rounded-xl border border-vinyl-black bg-white"
            >
              <Text className="text-sm font-semibold text-vinyl-black">Цуцлах</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(name, localImageUri)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Нэмэх"
              className="h-12 flex-1 items-center justify-center rounded-xl bg-vinyl-black"
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-semibold text-vinyl-paper">Нэмэх</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AdminGiftsContent() {
  const sessionQuery = useAuthSessionQuery();
  const ownerUserId = sessionQuery.data?.user.id ?? '';

  const giftOptionsQuery = useAdminGiftOptionsQuery();
  const createMutation = useCreateGiftOptionMutation();
  const updateMutation = useUpdateGiftOptionMutation();

  const [addOpen, setAddOpen] = useState(false);
  const onToggleAvailability = (id: string, next: boolean) => {
    updateMutation.mutate(
      { id, is_available: next },
      {
        onError: (e) =>
          Alert.alert(
            'Алдаа',
            e instanceof Error ? e.message : 'Хадгалж чадсангүй.',
          ),
      },
    );
  };

  const listHeader = (
    <View className="px-5 pt-2">
      <Text className="font-normal text-3xl text-vinyl-black">
        Бэлгийн боодлын удирдлага
      </Text>
      <Text className="mt-1 text-sm text-vinyl-muted">
        Боодлын сонголт болон бэлэн байдал
      </Text>

      <Pressable
        onPress={() => setAddOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Шинэ боодол нэмэх"
        className="mt-5 h-12 flex-row items-center justify-center rounded-2xl bg-vinyl-black"
      >
        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text className="ml-2 text-sm font-semibold text-vinyl-paper">
          Шинэ боодол нэмэх
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1">
      {giftOptionsQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : giftOptionsQuery.isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-semibold text-vinyl-black">
            Ачаалж чадсангүй
          </Text>
          <Text className="mt-2 text-center text-sm text-vinyl-muted">
            Сүлжээ болон Supabase тохиргоогоо шалгана уу.
          </Text>
        </View>
      ) : (
        <FlatList
          data={giftOptionsQuery.data ?? []}
          keyExtractor={(g) => g.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 20, gap: 12 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <Text className="px-5 pt-8 text-center text-sm text-vinyl-muted">
              Боодол олдсонгүй. Шинэ боодол нэмнэ үү.
            </Text>
          }
          renderItem={({ item }) => (
            <AdminGiftOptionCard item={item} onToggle={onToggleAvailability} />
          )}
        />
      )}

      <AddGiftOptionModal
        visible={addOpen}
        busy={createMutation.isPending}
        onClose={() => {
          if (!createMutation.isPending) setAddOpen(false);
        }}
        onConfirm={(name, localImageUri) => {
          if (!ownerUserId) {
            Alert.alert('Алдаа', 'Нэвтэрсэн хэрэглэгч олдсонгүй.');
            return;
          }
          createMutation.mutate(
            { name, localImageUri, ownerUserId },
            {
              onSuccess: () => setAddOpen(false),
              onError: (e) =>
                Alert.alert(
                  'Алдаа',
                  e instanceof Error ? e.message : 'Хадгалж чадсангүй.',
                ),
            },
          );
        }}
      />
    </View>
  );
}
