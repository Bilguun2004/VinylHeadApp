import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
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

import { useForgotPasswordMutation } from '../api/use-forgot-password-mutation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGES = {
  invalidEmail: 'Зөв имэйл хаяг оруулна уу.',
  rateLimited:
    'Хэт олон удаа оролдлоо. Хэсэг хүлээгээд дахин оролдоно уу.',
  network:
    'Сүлжээний алдаа. Интернэт холболтоо шалгаад дахин оролдоно уу.',
  generic: 'Алдаа гарлаа. Дахин оролдоно уу.',
};

function mapForgotPasswordError(err: unknown): string {
  if (!(err instanceof Error)) return MESSAGES.generic;
  const msg = err.message.toLowerCase();
  if (msg.includes('rate limit') || msg.includes('too many'))
    return MESSAGES.rateLimited;
  if (msg.includes('network') || msg.includes('fetch'))
    return MESSAGES.network;
  return err.message || MESSAGES.generic;
}

export function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const forgotPasswordMutation = useForgotPasswordMutation();
  const isBusy = forgotPasswordMutation.isPending;
  const canSubmit = email.trim().length > 0 && !isBusy;

  const errorText = useMemo(() => {
    if (localError) return localError;
    if (forgotPasswordMutation.error) {
      return mapForgotPasswordError(forgotPasswordMutation.error);
    }
    return null;
  }, [localError, forgotPasswordMutation.error]);

  const clearErrors = () => {
    if (localError) setLocalError(null);
    if (forgotPasswordMutation.error) forgotPasswordMutation.reset();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const trimmedEmail = email.trim();

    if (!EMAIL_RE.test(trimmedEmail)) {
      setLocalError(MESSAGES.invalidEmail);
      return;
    }

    setLocalError(null);
    forgotPasswordMutation.mutate(
      { email: trimmedEmail },
      {
        onSuccess: () => {
          setEmailSent(true);
        },
      },
    );
  };

  if (emailSent) {
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
            Имэйлээ шалгана уу
          </Text>
          <Text className="mt-3 text-center text-sm text-[#757575]">
            Бид {email.trim()} хаяг руу нууц үг сэргээх холбоос илгээлээ.
          </Text>
          <Text className="mt-2 text-center text-sm text-[#757575]">
            Холбоосыг утас дээрээ нээж, апп-аа ашиглана уу.
          </Text>
          <Link href="/" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Нэвтрэх рүү буцах"
              className="mt-8 h-14 w-full items-center justify-center rounded-xl bg-vinyl-black"
            >
              <Text className="text-base font-bold text-white">
                Нэвтрэх рүү буцах
              </Text>
            </Pressable>
          </Link>
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
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Буцах"
            hitSlop={8}
            className="mb-4 h-10 w-10 items-center justify-center"
          >
            <ArrowLeft size={22} color="#0A0A0A" />
          </Pressable>

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
              Нууц үг сэргээх
            </Text>
            <Text className="mt-2 text-center text-sm text-[#757575]">
              Имэйл хаягаа оруулбал сэргээх холбоос илгээнэ
            </Text>
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-[#757575]">
              Цахим шуудан
            </Text>
            <View className="rounded-xl bg-[#F2F0EF] px-4 py-3">
              <TextInput
                value={email}
                onChangeText={(value) => {
                  clearErrors();
                  setEmail(value);
                }}
                placeholder="your@email.com"
                placeholderTextColor="#A1A1A1"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!isBusy}
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
                className="text-base text-vinyl-black"
                accessibilityLabel="Цахим шуудан"
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
            accessibilityLabel="Илгээх"
            accessibilityState={{ disabled: !canSubmit, busy: isBusy }}
            className={`h-14 flex-row items-center justify-center rounded-xl ${
              canSubmit ? 'bg-vinyl-black' : 'bg-vinyl-black/50'
            }`}
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-bold text-white">Илгээх</Text>
            )}
          </Pressable>

          <View className="mt-8 flex-row items-center justify-center">
            <Text className="text-sm text-vinyl-black">Санаж байна уу? </Text>
            <Link href="/" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Нэвтрэх">
                <Text className="text-sm font-bold text-vinyl-black">
                  Нэвтрэх
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
