import * as ImagePicker from 'expo-image-picker';
import {
  ChevronDown,
  Clock,
  ImagePlus,
  Send,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { useAdminNotificationsQuery } from '../api/use-admin-notifications-query';
import type { BroadcastNotificationRow } from '../api/use-admin-notifications-query';
import { useSendNotificationMutation } from '../api/use-send-notification-mutation';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  notificationCategoryLabel,
} from '../lib/notification-categories';

const PREVIEW_WALLPAPER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type PanelTab = 'compose' | 'history';

function formatSentAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('mn-MN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function previewDateLabel(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('mn-MN', { weekday: 'long' });
  const monthDay = now.toLocaleDateString('mn-MN', {
    month: 'numeric',
    day: 'numeric',
  });
  return `${weekday}, ${monthDay}-р сарын ${now.getDate()}`;
}

function previewClock(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

type HistoryRowProps = {
  item: BroadcastNotificationRow;
};

function NotificationHistoryRow({ item }: HistoryRowProps) {
  return (
    <View className="mb-3 rounded-2xl bg-white px-4 py-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase text-vinyl-muted">
          {notificationCategoryLabel(item.category as NotificationCategory)}
        </Text>
        <Text className="text-xs text-vinyl-muted">{formatSentAt(item.sent_at)}</Text>
      </View>
      <Text className="mt-2 font-normal text-base font-semibold text-vinyl-black">
        {item.title}
      </Text>
      <Text className="mt-1 text-sm text-vinyl-muted" numberOfLines={3}>
        {item.body}
      </Text>
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          className="mt-3 h-28 w-full rounded-xl"
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

type LockScreenPreviewProps = {
  title: string;
  body: string;
  imageUri?: string;
};

function LockScreenPreview({ title, body, imageUri }: LockScreenPreviewProps) {
  const displayTitle = title.trim() || 'Гарчиг энд харагдана';
  const displayBody =
    body.trim() || 'Мэдэгдлийн агуулга энд харагдах болно...';

  return (
    <View className="mt-6 items-center px-5">
      <Text className="text-xs font-semibold tracking-widest text-vinyl-muted">
        УРЬДЧИЛАН ХАРАХ
      </Text>
      <View className="mt-4 w-full max-w-[280px] overflow-hidden rounded-[2rem] border-[3px] border-vinyl-black bg-vinyl-black">
        <ImageBackground
          source={{ uri: imageUri?.trim() || PREVIEW_WALLPAPER }}
          style={{ width: '100%', height: 420 }}
          className="justify-between px-4 pb-6 pt-10"
          resizeMode="cover"
        >
          <View className="items-center">
            <Text className="text-5xl font-light text-white">{previewClock()}</Text>
            <Text className="mt-1 text-sm text-white/90">{previewDateLabel()}</Text>
          </View>
          <View className="rounded-2xl bg-white/75 px-3 py-3">
            <View className="flex-row items-start gap-2">
              <View className="mt-0.5 h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-vinyl-divider">
                <Image
                  source={require('../../../../assets/icon.png')}
                  className="h-8 w-8"
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-semibold text-vinyl-black"
                  numberOfLines={1}
                >
                  {displayTitle}
                </Text>
                <Text className="mt-0.5 text-xs text-vinyl-muted" numberOfLines={2}>
                  {displayBody}
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>
    </View>
  );
}

export function AdminNotificationsContent() {
  const sessionQuery = useAuthSessionQuery();
  const ownerUserId = sessionQuery.data?.user.id ?? '';
  const notificationsQuery = useAdminNotificationsQuery();
  const sendMutation = useSendNotificationMutation();

  const [panelTab, setPanelTab] = useState<PanelTab>('compose');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<NotificationCategory>('deals');
  const [localImageUri, setLocalImageUri] = useState<string | undefined>();
  const [categoryOpen, setCategoryOpen] = useState(false);

  const categoryLabel = useMemo(
    () => notificationCategoryLabel(category),
    [category],
  );

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Зөвшөөрөл', 'Зургийн сан руу нэвтрэх эрх шаардлагатай.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    const asset = result.assets[0];
    if (asset.fileSize != null && asset.fileSize > MAX_IMAGE_BYTES) {
      Alert.alert('Зураг хэт том', 'PNG, JPG (Макс 5МБ)');
      return;
    }
    setLocalImageUri(asset.uri);
  };

  const resetCompose = () => {
    setTitle('');
    setBody('');
    setCategory('deals');
    setLocalImageUri(undefined);
  };

  const onSend = () => {
    if (!ownerUserId) {
      Alert.alert('Алдаа', 'Нэвтэрсэн хэрэглэгч олдсонгүй.');
      return;
    }
    sendMutation.mutate(
      {
        title,
        body,
        category,
        localImageUri,
        ownerUserId,
      },
      {
        onSuccess: (result) => {
          const pushNote =
            result.tokenCount === 0
              ? 'Төхөөрөмж бүртгэгдээгүй тул зөвхөн түүхэнд хадгаллаа.'
              : `${result.sent} төхөөрөмж рүү илгээлээ${result.failed > 0 ? ` (${result.failed} алдаатай)` : ''}.`;
          Alert.alert('Амжилттай', pushNote, [
            {
              text: 'OK',
              onPress: () => {
                resetCompose();
                setPanelTab('history');
              },
            },
          ]);
        },
        onError: (e) =>
          Alert.alert(
            'Алдаа',
            e instanceof Error ? e.message : 'Илгээж чадсангүй.',
          ),
      },
    );
  };

  const listHeader = (
    <View className="px-5 pt-2">
      <Text className="font-normal text-3xl text-vinyl-black">Мэдэгдэл илгээх</Text>
      <Text className="mt-1 text-sm text-vinyl-muted">
        Push мэдэгдэл бичиж илгээнэ үү
      </Text>

      <View className="mt-5 flex-row rounded-2xl bg-vinyl-surface p-1">
        <Pressable
          onPress={() => setPanelTab('compose')}
          accessibilityRole="tab"
          accessibilityState={{ selected: panelTab === 'compose' }}
          className={`flex-1 items-center rounded-xl py-2.5 ${
            panelTab === 'compose' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            className={`text-sm ${
              panelTab === 'compose'
                ? 'font-semibold text-vinyl-black'
                : 'text-vinyl-muted'
            }`}
          >
            Шинэ мэдэгдэл
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPanelTab('history')}
          accessibilityRole="tab"
          accessibilityState={{ selected: panelTab === 'history' }}
          className={`flex-1 items-center rounded-xl py-2.5 ${
            panelTab === 'history' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            className={`text-sm ${
              panelTab === 'history'
                ? 'font-semibold text-vinyl-black'
                : 'text-vinyl-muted'
            }`}
          >
            Түүх
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const composeBody = (
    <>
      <View className="mx-5 mt-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
        <Text className="font-normal text-lg font-semibold text-vinyl-black">
          Агуулга
        </Text>
        <View className="mt-4">
          <Text className="text-xs text-vinyl-muted">Мэдэгдлийн гарчиг</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Жишээ: Шинэ хямдрал зарлагдлаа!"
            placeholderTextColor="#A1A1A1"
            className="mt-1 py-2 text-sm text-vinyl-black"
            accessibilityLabel="Мэдэгдлийн гарчиг"
          />
        </View>
        <View className="my-3 h-px bg-vinyl-divider" />
        <View>
          <Text className="text-xs text-vinyl-muted">Үндсэн текст</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Энэ амралтын өдрүүдэд бүх пянь 20% хямдарна. Та яараарай!"
            placeholderTextColor="#A1A1A1"
            multiline
            className="mt-1 min-h-[72px] py-2 text-sm text-vinyl-black"
            accessibilityLabel="Үндсэн текст"
          />
        </View>
      </View>

      <View className="mx-5 mt-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
        <Text className="font-normal text-lg font-semibold text-vinyl-black">
          Тохиргоо
        </Text>
        <View className="mt-4 flex-row gap-4">
          <View className="flex-1">
            <Text className="text-xs text-vinyl-muted">Ангилал</Text>
            <Pressable
              onPress={() => setCategoryOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Ангилал сонгох"
              className="mt-2 flex-row items-center justify-between rounded-xl border border-vinyl-divider px-3 py-2.5"
            >
              <Text className="text-sm text-vinyl-black">{categoryLabel}</Text>
              <ChevronDown size={18} color="#6B6B6B" />
            </Pressable>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-vinyl-muted">Хугацаа</Text>
            <View className="mt-2 flex-row items-center gap-2 rounded-xl border border-vinyl-divider px-3 py-2.5">
              <Clock size={16} color="#6B6B6B" />
              <Text className="text-sm text-vinyl-black">Яг одоо</Text>
            </View>
          </View>
        </View>
        <View className="my-4 h-px bg-vinyl-divider" />
        <Text className="text-xs text-vinyl-muted">
          Зураг хавсаргах (Сонголтоор)
        </Text>
        {localImageUri ? (
          <Pressable
            onPress={pickImage}
            disabled={sendMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Зураг солих"
            className="mt-3 overflow-hidden rounded-xl border border-vinyl-divider"
          >
            <Image
              source={{ uri: localImageUri }}
              className="h-28 w-full"
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        ) : (
          <Pressable
            onPress={pickImage}
            disabled={sendMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Зураг сонгох"
            className="mt-3 h-28 items-center justify-center rounded-xl border border-dashed border-vinyl-divider bg-vinyl-surface"
          >
            <ImagePlus size={28} color="#6B6B6B" />
          </Pressable>
        )}
      </View>

      <View className="mx-5 mt-4">
        {localImageUri ? (
          <View className="overflow-hidden rounded-2xl border border-vinyl-divider bg-white">
            <Image
              source={{ uri: localImageUri }}
              className="h-36 w-full"
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            <Pressable
              onPress={pickImage}
              disabled={sendMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Зураг солих"
              className="border-t border-vinyl-divider py-3"
            >
              <Text className="text-center text-sm text-vinyl-muted">
                Зураг солих
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={pickImage}
            disabled={sendMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Зураг чирж оруулах эсвэл сонгох"
            className="h-36 items-center justify-center rounded-2xl border border-dashed border-vinyl-divider bg-white px-4"
          >
            <ImagePlus size={32} color="#6B6B6B" />
            <Text className="mt-3 text-center text-sm text-vinyl-black">
              Зураг чирж оруулах эсвэл сонгох
            </Text>
            <Text className="mt-1 text-center text-xs text-vinyl-muted">
              PNG, JPG (Макс 5МБ)
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={onSend}
          disabled={sendMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Нийтэд илгээх"
          className="mt-4 h-14 flex-row items-center justify-center rounded-2xl bg-vinyl-black"
        >
          {sendMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Send size={18} color="#FFFFFF" />
              <Text className="ml-2 text-sm font-semibold text-vinyl-paper">
                Нийтэд илгээх
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <LockScreenPreview title={title} body={body} imageUri={localImageUri} />
      <View className="h-28" />
    </>
  );

  if (notificationsQuery.isPending && panelTab === 'history') {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-vinyl-canvas">
      {panelTab === 'compose' ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
        >
          {listHeader}
          {composeBody}
        </ScrollView>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={notificationsQuery.data ?? []}
          keyExtractor={(n) => n.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          nestedScrollEnabled
          ListHeaderComponent={
            <>
              {listHeader}
              {notificationsQuery.isError ? (
                <Text className="px-5 pt-4 text-center text-sm text-vinyl-muted">
                  Түүхийг ачаалж чадсангүй.
                </Text>
              ) : null}
            </>
          }
          ListEmptyComponent={
            !notificationsQuery.isPending ? (
              <Text className="px-5 pt-8 text-center text-sm text-vinyl-muted">
                Илгээсэн мэдэгдэл байхгүй.
              </Text>
            ) : (
              <View className="py-8">
                <ActivityIndicator />
              </View>
            )
          }
          renderItem={({ item }) => <NotificationHistoryRow item={item} />}
        />
      )}

      <Modal visible={categoryOpen} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            className="absolute inset-0"
            accessibilityRole="button"
            accessibilityLabel="Хаах"
            onPress={() => setCategoryOpen(false)}
          />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-3 text-center font-normal text-lg font-semibold text-vinyl-black">
              Ангилал
            </Text>
            {NOTIFICATION_CATEGORIES.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setCategory(opt.value);
                  setCategoryOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                className={`mb-2 rounded-xl px-4 py-3 ${
                  category === opt.value ? 'bg-vinyl-surface' : 'bg-white'
                }`}
              >
                <Text
                  className={`text-sm ${
                    category === opt.value
                      ? 'font-semibold text-vinyl-black'
                      : 'text-vinyl-muted'
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
