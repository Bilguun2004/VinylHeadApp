import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { LogOut, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AdminOrderWithDetails } from '../../admin/api/use-admin-orders-query';
import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { useDeleteAccountMutation } from '../../auth/api/use-delete-account-mutation';
import { useSignOutMutation } from '../../auth/api/use-sign-out-mutation';
import { getPrivacyPolicyUrl } from '../../../lib/legal-urls';
import { OrderCard } from '../../orders/components/order-card';
import { useCustomerOrdersQuery } from '../api/use-customer-orders-query';
import { useProfileQuery } from '../api/use-profile-query';
import { useUpdateProfileMutation } from '../api/use-update-profile-mutation';
import { useUploadProfileAvatarMutation } from '../api/use-upload-profile-avatar-mutation';
import { ProfileAvatar } from './profile-avatar';

const PROFILE_ORDERS_PREVIEW = 5;

function ProfileField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  editable,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
  editable: boolean;
}) {
  return (
    <View className="mb-6">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-[#757575]">
        {label}
      </Text>
      <View className="mt-2 rounded-xl bg-[#F2F0EF] px-4 py-4">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A1A1A1"
          autoCapitalize={keyboardType === 'phone-pad' ? 'none' : 'words'}
          autoCorrect={false}
          keyboardType={keyboardType}
          textContentType={keyboardType === 'phone-pad' ? 'telephoneNumber' : 'name'}
          editable={editable}
          className="p-0 font-normal text-base leading-6 text-vinyl-black"
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

export function CustomerProfileTab() {
  const router = useRouter();
  const sessionQuery = useAuthSessionQuery();
  const userId = sessionQuery.data?.user.id;

  const profileQuery = useProfileQuery(userId);
  const ordersQuery = useCustomerOrdersQuery(userId);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void ordersQuery.refetch();
    }, [userId, ordersQuery.refetch]),
  );

  const signOutMutation = useSignOutMutation();
  const deleteAccountMutation = useDeleteAccountMutation();
  const updateProfileMutation = useUpdateProfileMutation();
  const privacyPolicyUrl = getPrivacyPolicyUrl();
  const uploadAvatarMutation = useUploadProfileAvatarMutation();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (!profileQuery.data) return;
    setFullName(profileQuery.data.full_name ?? '');
    setPhoneNumber(profileQuery.data.phone_number ?? '');
  }, [profileQuery.data?.id, profileQuery.data?.full_name, profileQuery.data?.phone_number]);

  const hasProfileChanges = useMemo(() => {
    if (!profileQuery.data) return false;
    const currentName = profileQuery.data.full_name?.trim() ?? '';
    const currentPhone = profileQuery.data.phone_number?.trim() ?? '';
    return (
      fullName.trim() !== currentName || phoneNumber.trim() !== currentPhone
    );
  }, [profileQuery.data, fullName, phoneNumber]);

  const canSaveProfile =
    Boolean(userId) &&
    Boolean(profileQuery.data) &&
    hasProfileChanges &&
    !updateProfileMutation.isPending;

  const handlePickAvatar = async () => {
    if (!userId || uploadAvatarMutation.isPending) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (res.canceled) return;
    const uri = res.assets?.[0]?.uri;
    if (!uri) return;

    uploadAvatarMutation.mutate(
      { userId, localUri: uri },
      {
        onSuccess: () => {
          Alert.alert('Амжилттай', 'Профайл зураг шинэчлэгдлээ.');
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Зураг байршуулахад алдаа гарлаа.';
          Alert.alert('Алдаа', message);
        },
      },
    );
  };

  const handleSaveProfile = () => {
    if (!userId || !canSaveProfile) return;
    updateProfileMutation.mutate(
      {
        userId,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
      },
      {
        onSuccess: () => {
          Alert.alert('Амжилттай', 'Мэдээлэл хадгалагдлаа.');
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Хадгалахад алдаа гарлаа.';
          Alert.alert('Алдаа', message);
        },
      },
    );
  };

  const handleLogout = () => {
    Alert.alert('Гарах', 'Та гарахдаа итгэлтэй байна уу?', [
      { text: 'Цуцлах', style: 'cancel' },
      {
        text: 'Гарах',
        style: 'destructive',
        onPress: () => {
          signOutMutation.mutate(undefined, {
            onError: (err) => {
              const message =
                err instanceof Error ? err.message : 'Гарахад алдаа гарлаа.';
              Alert.alert('Алдаа', message);
            },
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Бүртгэл устгах',
      'Таны профайл, чат, мэдэгдэл болон бусад хувийн мэдээлэл бүрмөсөн устгагдана. Захиалгын түүх хадгалагдаж болно. Үйлдлийг буцаах боломжгүй. Үргэлжлүүлэх үү?',
      [
        { text: 'Цуцлах', style: 'cancel' },
        {
          text: 'Бүртгэл устгах',
          style: 'destructive',
          onPress: () => {
            deleteAccountMutation.mutate(undefined, {
              onError: (err) => {
                const message =
                  err instanceof Error
                    ? err.message
                    : 'Бүртгэл устгаж чадсангүй. Дахин оролдоно уу.';
                Alert.alert('Алдаа', message);
              },
            });
          },
        },
      ],
    );
  };

  const handleOpenPrivacyPolicy = () => {
    if (!privacyPolicyUrl) return;
    void Linking.openURL(privacyPolicyUrl);
  };

  const avatarUploading = uploadAvatarMutation.isPending;

  const busy =
    signOutMutation.isPending ||
    deleteAccountMutation.isPending ||
    updateProfileMutation.isPending ||
    avatarUploading ||
    profileQuery.isPending;

  const allOrders = ordersQuery.data ?? [];
  const previewOrders = allOrders.slice(0, PROFILE_ORDERS_PREVIEW);
  const showSeeAllLink = allOrders.length > 0;

  const displayName = fullName.trim();

  const onOpenOrder = (order: AdminOrderWithDetails) => {
    router.push({
      pathname: '/order/[id]',
      params: { id: order.id },
    });
  };

  return (
    <View className="flex-1 bg-vinyl-paper">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-6 pb-6 pt-6"
        keyboardShouldPersistTaps="handled"
      >
        {profileQuery.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator />
          </View>
        ) : profileQuery.isError ? (
          <View className="items-center px-6 py-16">
            <Text className="text-center text-base font-semibold text-vinyl-black">
              Профайл ачаалж чадсангүй
            </Text>
            <Text className="mt-1 text-center text-sm text-vinyl-muted">
              Сүлжээгээ шалгаад дахин оролдоно уу.
            </Text>
            <Pressable
              onPress={() => void profileQuery.refetch()}
              className="mt-4 rounded-xl bg-vinyl-black px-6 py-3"
            >
              <Text className="text-sm font-semibold text-vinyl-paper">
                Дахин оролдох
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="mb-8 items-center pt-2">
              <ProfileAvatar
                avatarUrl={profileQuery.data?.avatar_url ?? null}
                size={112}
                onPress={handlePickAvatar}
                busy={avatarUploading}
                showEditHint
                accessibilityLabel="Профайл зураг солих"
              />
              {displayName ? (
                <Text className="mt-5 text-center font-normal text-[28px] font-bold leading-8 text-vinyl-black">
                  {displayName}
                </Text>
              ) : null}
            </View>

            <ProfileField
              label="Овог нэр"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Бат-Эрдэнэ"
              editable={!busy}
            />
            <ProfileField
              label="Утасны дугаар"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+976 9911-XXXX"
              keyboardType="phone-pad"
              editable={!busy}
            />

            <Pressable
              onPress={handleSaveProfile}
              disabled={!canSaveProfile}
              accessibilityRole="button"
              accessibilityLabel="Өөрчлөлт хадгалах"
              accessibilityState={{ disabled: !canSaveProfile, busy: updateProfileMutation.isPending }}
              className={`mb-6 h-12 items-center justify-center rounded-2xl ${
                canSaveProfile ? 'bg-vinyl-black' : 'bg-vinyl-black/40'
              }`}
            >
              {updateProfileMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-semibold text-vinyl-paper">
                  Өөрчлөлт хадгалах
                </Text>
              )}
            </Pressable>

            <View className="flex-row items-end justify-between">
              <Text className="font-normal text-2xl font-semibold text-vinyl-black">
                Миний захиалга
              </Text>
              {showSeeAllLink ? (
                <Pressable
                  onPress={() => router.push('/profile/orders')}
                  accessibilityRole="link"
                  accessibilityLabel="Бүгдийг харах"
                  hitSlop={8}
                >
                  <Text className="text-sm font-medium text-vinyl-muted underline">
                    Бүгдийг харах
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {ordersQuery.isPending ? (
              <View className="items-center py-10">
                <ActivityIndicator />
              </View>
            ) : ordersQuery.isError ? (
              <Text className="mt-4 text-center text-sm text-vinyl-muted">
                Захиалга ачаалж чадсангүй.
              </Text>
            ) : previewOrders.length === 0 ? (
              <Text className="mt-4 text-center text-sm text-vinyl-muted">
                Захиалга олдсонгүй.
              </Text>
            ) : (
              <View className="mt-4">
                {previewOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onOpen={onOpenOrder} />
                ))}
              </View>
            )}

            {privacyPolicyUrl ? (
              <Pressable
                onPress={handleOpenPrivacyPolicy}
                accessibilityRole="link"
                accessibilityLabel="Нууцлалын бодлого"
                className="mt-8 items-center py-2"
              >
                <Text className="text-sm text-vinyl-muted underline">
                  Нууцлалын бодлого
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      <View className="gap-3 border-t border-vinyl-divider bg-vinyl-paper px-6 py-4">
        <Pressable
          onPress={handleLogout}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Гарах"
          accessibilityState={{ disabled: busy, busy }}
          className={`h-14 flex-row items-center justify-center rounded-2xl border border-red-200 bg-white ${
            busy ? 'opacity-70' : ''
          }`}
        >
          {signOutMutation.isPending ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <>
              <LogOut size={20} color="#DC2626" />
              <Text className="ml-2 text-base font-semibold text-red-600">Гарах</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={handleDeleteAccount}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Бүртгэл устгах"
          accessibilityState={{ disabled: busy, busy: deleteAccountMutation.isPending }}
          className={`h-14 flex-row items-center justify-center rounded-2xl border border-red-300 bg-red-50 ${
            busy ? 'opacity-70' : ''
          }`}
        >
          {deleteAccountMutation.isPending ? (
            <ActivityIndicator color="#B91C1C" />
          ) : (
            <>
              <Trash2 size={20} color="#B91C1C" />
              <Text className="ml-2 text-base font-semibold text-red-700">
                Бүртгэл устгах
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
