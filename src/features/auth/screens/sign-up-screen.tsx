import { Link, useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react-native';
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

import { useAppleSignInMutation } from '../api/use-apple-sign-in-mutation';
import { useSignUpMutation } from '../api/use-sign-up-mutation';
import { AppleSignInButton } from '../components/apple-sign-in-button';
import { PrivacyPolicyLink } from '../../legal/components/privacy-policy-link';
import { mapAppleAuthError } from '../lib/map-apple-auth-error';

// Supabase enforces 6+ chars by default; mirror that locally so the
// user gets feedback before we hit the network.
const MIN_PASSWORD_LENGTH = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// TODO(i18n): move into a shared message map alongside login-screen.
const MESSAGES = {
  invalidEmail: 'Зөв имэйл хаяг оруулна уу.',
  shortPassword: `Нууц үг хамгийн багадаа ${MIN_PASSWORD_LENGTH} тэмдэгт байх ёстой.`,
  passwordsDontMatch: 'Нууц үг таарахгүй байна.',
  alreadyRegistered:
    'Энэ имэйл аль хэдийн бүртгэгдсэн байна. Нэвтэрнэ үү.',
  alreadyRegisteredPhone:
    'Энэ утасны дугаар аль хэдийн бүртгэгдсэн байна.',
  rateLimited:
    'Хэт олон удаа оролдлоо. Хэсэг хүлээгээд дахин оролдоно уу.',
  network:
    'Сүлжээний алдаа. Интернэт холболтоо шалгаад дахин оролдоно уу.',
  generic: 'Алдаа гарлаа. Дахин оролдоно уу.',
  appleFailed: 'Apple-ээр нэвтэрч чадсангүй. Дахин оролдоно уу.',
};

function mapSignUpError(err: unknown): string {
  if (!(err instanceof Error)) return MESSAGES.generic;
  const msg = err.message.toLowerCase();
  if (
    msg.includes('phone_number_already') ||
    msg.includes('phone already registered')
  ) {
    return MESSAGES.alreadyRegisteredPhone;
  }
  if (
    msg.includes('email_already') ||
    msg.includes('already registered') ||
    msg.includes('user already')
  ) {
    return MESSAGES.alreadyRegistered;
  }
  if (msg.includes('rate limit') || msg.includes('too many'))
    return MESSAGES.rateLimited;
  if (msg.includes('network') || msg.includes('fetch'))
    return MESSAGES.network;
  return err.message || MESSAGES.generic;
}

export function SignUpScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Local validation errors we surface only after the user tries to submit;
  // avoids yelling at them while they're still typing.
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const signUpMutation = useSignUpMutation();
  const appleMutation = useAppleSignInMutation();
  const [showAppleButton, setShowAppleButton] = useState(false);

  useEffect(() => {
    void (async () => {
      if (Platform.OS === 'ios') {
        const appleAvailable = await AppleAuthentication.isAvailableAsync();
        setShowAppleButton(appleAvailable);
      } else {
        setShowAppleButton(true);
      }
    })();
  }, []);

  const isBusy = signUpMutation.isPending || appleMutation.isPending;
  const canSubmit =
    username.trim().length > 0 &&
    phoneNumber.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    !isBusy;

  const errorText = useMemo(() => {
    if (localError) return localError;
    if (signUpMutation.error) return mapSignUpError(signUpMutation.error);
    if (appleMutation.error) {
      return mapAppleAuthError(appleMutation.error);
    }
    return null;
  }, [localError, signUpMutation.error, appleMutation.error]);

  const clearErrors = () => {
    if (localError) setLocalError(null);
    if (signUpMutation.error) signUpMutation.reset();
    if (appleMutation.error) appleMutation.reset();
  };

  const handleApple = () => {
    if (isBusy) return;
    appleMutation.mutate();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const trimmedEmail = email.trim();

    if (!EMAIL_RE.test(trimmedEmail)) {
      setLocalError(MESSAGES.invalidEmail);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(MESSAGES.shortPassword);
      return;
    }
    if (password !== confirmPassword) {
      setLocalError(MESSAGES.passwordsDontMatch);
      return;
    }

    setLocalError(null);
    signUpMutation.mutate(
      { username: username.trim(), phoneNumber: phoneNumber.trim(), email: trimmedEmail, password },
      {
        onSuccess: (result) => {
          if (result.needsEmailConfirmation) {
            setConfirmationSent(true);
            return;
          }
        },
      },
    );
  };

  if (confirmationSent) {
    return (
      <SafeAreaView className="flex-1 bg-vinyl-paper" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <Image
            source={require('../../../../assets/logo.png')}
            className="h-12 w-12"
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text className="mt-8 text-center text-xl font-semibold text-vinyl-black">
            Имэйлээ шалгана уу
          </Text>
          <Text className="mt-3 text-center text-sm text-vinyl-muted">
            Бид {email.trim()} хаяг руу баталгаажуулах холбоос илгээлээ.
          </Text>
          <Link href="/" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Нэвтрэх рүү буцах"
              className="mt-8 h-14 w-full items-center justify-center rounded-2xl bg-vinyl-black"
            >
              <Text className="text-base font-semibold text-vinyl-paper">
                Нэвтрэх рүү буцах
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-vinyl-paper" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pt-4 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Буцах"
            hitSlop={8}
            className="h-10 w-10 items-center justify-center"
          >
            <ArrowLeft size={22} color="#0A0A0A" />
          </Pressable>

          <View className="items-center pb-8 pt-2">
            <Image
              source={require('../../../../assets/logo.png')}
              className="h-12 w-12"
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text className="mt-4 text-2xl font-semibold text-vinyl-black">
              Бүртгүүлэх
            </Text>
            <Text className="mt-1 text-sm text-vinyl-muted">
              Шинэ бүртгэл үүсгэх
            </Text>
          </View>

          <View className="mb-4 rounded-2xl bg-vinyl-input px-4 py-3">
            <View className="flex-row items-center">
              <User size={14} color="#6B6B6B" />
              <Text className="ml-2 text-xs text-vinyl-muted">Нэр</Text>
            </View>
            <TextInput
              value={username}
              onChangeText={(value) => {
                clearErrors();
                setUsername(value);
              }}
              placeholder="Таны нэр"
              placeholderTextColor="#A1A1A1"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isBusy}
              className="mt-1 text-base text-vinyl-black"
              accessibilityLabel="Нэр"
            />
          </View>

          <View className="mb-4 rounded-2xl bg-vinyl-input px-4 py-3">
            <View className="flex-row items-center">
              <Phone size={14} color="#6B6B6B" />
              <Text className="ml-2 text-xs text-vinyl-muted">Утасны дугаар</Text>
            </View>
            <TextInput
              value={phoneNumber}
              onChangeText={(value) => {
                clearErrors();
                setPhoneNumber(value);
              }}
              placeholder="99112233"
              placeholderTextColor="#A1A1A1"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isBusy}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              className="mt-1 text-base text-vinyl-black"
              accessibilityLabel="Утасны дугаар"
            />
          </View>

          <View className="mb-4 rounded-2xl bg-vinyl-input px-4 py-3">
            <View className="flex-row items-center">
              <Mail size={14} color="#6B6B6B" />
              <Text className="ml-2 text-xs text-vinyl-muted">Цахим шуудан</Text>
            </View>
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
              className="mt-1 text-base text-vinyl-black"
              accessibilityLabel="Цахим шуудан"
            />
          </View>

          <View className="mb-4 rounded-2xl bg-vinyl-input px-4 py-3">
            <View className="flex-row items-center">
              <Lock size={14} color="#6B6B6B" />
              <Text className="ml-2 text-xs text-vinyl-muted">Нууц үг</Text>
            </View>
            <View className="mt-1 flex-row items-center">
              <TextInput
                value={password}
                onChangeText={(value) => {
                  clearErrors();
                  setPassword(value);
                }}
                placeholder="••••••••"
                placeholderTextColor="#A1A1A1"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
                textContentType="newPassword"
                editable={!isBusy}
                className="flex-1 text-base text-vinyl-black"
                accessibilityLabel="Нууц үг"
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Нууц үг нуух' : 'Нууц үг харуулах'
                }
                hitSlop={8}
                className="ml-2"
              >
                {showPassword ? (
                  <EyeOff size={18} color="#6B6B6B" />
                ) : (
                  <Eye size={18} color="#6B6B6B" />
                )}
              </Pressable>
            </View>
          </View>

          <View className="mb-2 rounded-2xl bg-vinyl-input px-4 py-3">
            <View className="flex-row items-center">
              <Lock size={14} color="#6B6B6B" />
              <Text className="ml-2 text-xs text-vinyl-muted">
                Нууц үг давтах
              </Text>
            </View>
            <TextInput
              value={confirmPassword}
              onChangeText={(value) => {
                clearErrors();
                setConfirmPassword(value);
              }}
              placeholder="••••••••"
              placeholderTextColor="#A1A1A1"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              textContentType="newPassword"
              editable={!isBusy}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
              className="mt-1 text-base text-vinyl-black"
              accessibilityLabel="Нууц үг давтах"
            />
          </View>

          {errorText ? (
            <Text
              className="mb-3 text-sm text-red-600"
              accessibilityLiveRegion="polite"
            >
              {errorText}
            </Text>
          ) : (
            <View className="mb-4" />
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Бүртгүүлэх"
            accessibilityState={{ disabled: !canSubmit, busy: isBusy }}
            className={`h-14 flex-row items-center justify-center rounded-2xl ${
              canSubmit ? 'bg-vinyl-black' : 'bg-vinyl-black/50'
            }`}
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-semibold text-vinyl-paper">
                Бүртгүүлэх
              </Text>
            )}
          </Pressable>

          {showAppleButton ? (
            <>
              <View className="my-6 flex-row items-center">
                <View className="h-px flex-1 bg-[#E5E5E5]" />
                <Text className="mx-3 text-xs text-vinyl-muted">эсвэл</Text>
                <View className="h-px flex-1 bg-[#E5E5E5]" />
              </View>
              <AppleSignInButton
                onPress={handleApple}
                disabled={isBusy}
                busy={appleMutation.isPending}
                label="Apple-ээр үргэлжлүүлэх"
              />
            </>
          ) : null}

          <View className="mt-8 flex-row items-center justify-center">
            <Text className="text-sm text-vinyl-muted">Бүртгэлтэй юу? </Text>
            <Link href="/" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Нэвтрэх">
                <Text className="text-sm font-semibold text-vinyl-black">
                  Нэвтрэх
                </Text>
              </Pressable>
            </Link>
          </View>

          <PrivacyPolicyLink
            helperText="Бүртгүүлснээр Нууцлалын бодлогыг хүлээн зөвшөөрнө"
            className="mt-4 items-center py-2"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
