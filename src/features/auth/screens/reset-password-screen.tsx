import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUpdatePasswordMutation } from '../api/use-update-password-mutation';
import { createSessionFromUrl } from '../lib/create-session-from-url';
import { supabase } from '../../../lib/supabase';

const MIN_PASSWORD_LENGTH = 6;

const MESSAGES = {
  shortPassword: `Нууц үг хамгийн багадаа ${MIN_PASSWORD_LENGTH} тэмдэгт байх ёстой.`,
  passwordsDontMatch: 'Нууц үг таарахгүй байна.',
  invalidLink:
    'Сэргээх холбоос хүчингүй эсвэл хугацаа дууссан байна. Дахин оролдоно уу.',
  rateLimited:
    'Хэт олон удаа оролдлоо. Хэсэг хүлээгээд дахин оролдоно уу.',
  network:
    'Сүлжээний алдаа. Интернэт холболтоо шалгаад дахин оролдоно уу.',
  generic: 'Алдаа гарлаа. Дахин оролдоно уу.',
};

function mapUpdatePasswordError(err: unknown): string {
  if (!(err instanceof Error)) return MESSAGES.generic;
  const msg = err.message.toLowerCase();
  if (msg.includes('rate limit') || msg.includes('too many'))
    return MESSAGES.rateLimited;
  if (msg.includes('network') || msg.includes('fetch'))
    return MESSAGES.network;
  return err.message || MESSAGES.generic;
}

export function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [linkReady, setLinkReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const updatePasswordMutation = useUpdatePasswordMutation();
  const isBusy = updatePasswordMutation.isPending;
  const canSubmit =
    password.length > 0 && confirmPassword.length > 0 && !isBusy && linkReady;

  const errorText = useMemo(() => {
    if (localError) return localError;
    if (updatePasswordMutation.error) {
      return mapUpdatePasswordError(updatePasswordMutation.error);
    }
    return null;
  }, [localError, updatePasswordMutation.error]);

  useEffect(() => {
    let mounted = true;

    const establishRecoverySession = async (url: string | null) => {
      if (url) {
        const created = await createSessionFromUrl(url);
        if (created && mounted) {
          setLinkReady(true);
          setLinkError(null);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session) {
        setLinkReady(true);
        setLinkError(null);
        return;
      }

      setLinkError(MESSAGES.invalidLink);
    };

    void Linking.getInitialURL().then((url) => {
      void establishRecoverySession(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void establishRecoverySession(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const clearErrors = () => {
    if (localError) setLocalError(null);
    if (updatePasswordMutation.error) updatePasswordMutation.reset();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(MESSAGES.shortPassword);
      return;
    }
    if (password !== confirmPassword) {
      setLocalError(MESSAGES.passwordsDontMatch);
      return;
    }

    setLocalError(null);
    updatePasswordMutation.mutate(
      { password },
      {
        onSuccess: async () => {
          await supabase.auth.signOut();
          setPasswordUpdated(true);
        },
      },
    );
  };

  if (passwordUpdated) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F8F8]" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-4 items-center justify-center rounded-xl bg-white p-3">
            <Image
              source={require('../../../../assets/logo.png')}
              className="h-12 w-12"
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text className="text-center text-xl font-bold text-vinyl-black">
            Нууц үг шинэчлэгдлээ
          </Text>
          <Text className="mt-3 text-center text-sm text-[#757575]">
            Шинэ нууц үгээрээ нэвтэрнэ үү.
          </Text>
          <Link href="/" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Нэвтрэх"
              className="mt-8 h-14 w-full items-center justify-center rounded-xl bg-vinyl-black"
            >
              <Text className="text-base font-bold text-white">Нэвтрэх</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  if (linkError) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F8F8]" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-red-600">{linkError}</Text>
          <Link href="/forgot-password" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Дахин оролдох"
              className="mt-8 h-14 w-full items-center justify-center rounded-xl bg-vinyl-black"
            >
              <Text className="text-base font-bold text-white">Дахин оролдох</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  if (!linkReady) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F8F8]" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0A0A0A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8F8F8]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center pb-8">
            <View className="mb-4 items-center justify-center rounded-xl bg-white p-3">
              <Image
                source={require('../../../../assets/logo.png')}
                className="h-12 w-12"
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
            <Text className="text-xl font-bold text-vinyl-black">
              Шинэ нууц үг
            </Text>
            <Text className="mt-2 text-center text-sm text-[#757575]">
              Шинэ нууц үгээ оруулна уу
            </Text>
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-[#757575]">
              Нууц үг
            </Text>
            <View className="rounded-xl bg-[#F2F0EF] px-4 py-3">
              <TextInput
                value={password}
                onChangeText={(value) => {
                  clearErrors();
                  setPassword(value);
                }}
                placeholder="••••••••"
                placeholderTextColor="#A1A1A1"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
                textContentType="newPassword"
                editable={!isBusy}
                className="text-base text-vinyl-black"
                accessibilityLabel="Нууц үг"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-[#757575]">
              Нууц үг давтах
            </Text>
            <View className="rounded-xl bg-[#F2F0EF] px-4 py-3">
              <TextInput
                value={confirmPassword}
                onChangeText={(value) => {
                  clearErrors();
                  setConfirmPassword(value);
                }}
                placeholder="••••••••"
                placeholderTextColor="#A1A1A1"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
                textContentType="newPassword"
                editable={!isBusy}
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
                className="text-base text-vinyl-black"
                accessibilityLabel="Нууц үг давтах"
              />
            </View>
          </View>

          {errorText ? (
            <Text
              className="mb-3 text-sm text-red-600"
              accessibilityLiveRegion="polite"
            >
              {errorText}
            </Text>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Хадгалах"
            accessibilityState={{ disabled: !canSubmit, busy: isBusy }}
            className={`h-14 flex-row items-center justify-center rounded-xl ${
              canSubmit ? 'bg-vinyl-black' : 'bg-vinyl-black/50'
            }`}
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-bold text-white">Хадгалах</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
