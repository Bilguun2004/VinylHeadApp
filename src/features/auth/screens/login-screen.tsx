import type { Session } from '@supabase/supabase-js';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { useFacebookSignInMutation } from '../api/use-facebook-sign-in-mutation';
import { useSignInMutation } from '../api/use-sign-in-mutation';
import { DebugBootStrip } from '../components/debug-boot-strip';
import { FacebookLogo } from '../components/facebook-logo';
import {
  canUseBiometricLogin,
  enableBiometricLogin,
  getBiometricLoginEmail,
  getBiometricSupport,
  logBiometricDebugState,
  repairBiometricLoginState,
} from '../lib/biometric-auth';

// TODO(i18n): move these strings into a shared message map once we wire
// up i18n. Hard-coding Mongolian here matches the current login mockup.
const MESSAGES = {
  invalidCredentials:
    'Имэйл эсвэл нууц үг буруу байна. Та дахин оролдоно уу.',
  emailNotConfirmed: 'Та эхлээд имэйлээ баталгаажуулна уу.',
  rateLimited:
    'Хэт олон удаа оролдлоо. Хэсэг хүлээгээд дахин оролдоно уу.',
  network:
    'Сүлжээний алдаа. Интернэт холболтоо шалгаад дахин оролдоно уу.',
  facebookFailed: 'Facebook-ээр нэвтэрч чадсангүй. Дахин оролдоно уу.',
  generic: 'Алдаа гарлаа. Дахин оролдоно уу.',
};

function mapAuthError(err: unknown): string {
  if (!(err instanceof Error)) return MESSAGES.generic;
  const msg = err.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return MESSAGES.invalidCredentials;
  if (msg.includes('email not confirmed')) return MESSAGES.emailNotConfirmed;
  if (msg.includes('rate limit') || msg.includes('too many'))
    return MESSAGES.rateLimited;
  if (msg.includes('network') || msg.includes('fetch'))
    return MESSAGES.network;
  return err.message || MESSAGES.generic;
}

function promptEnableBiometric(
  session: Session,
  signedInEmail: string,
  biometricLabel: string,
  onSkip: () => void,
  onEnabled: () => void,
) {
  Alert.alert(
    `${biometricLabel} идэвхжүүлэх үү?`,
    'Дараагийн удаа имэйл, нууц үг оруулахгүйгээр биометрикээр нэвтэрнэ.',
    [
      { text: 'Одоо биш', style: 'cancel', onPress: onSkip },
      {
        text: 'Идэвхжүүлэх',
        onPress: () => {
          void enableBiometricLogin(session, signedInEmail)
            .then(onEnabled)
            .catch((err: unknown) => {
              const message =
                err instanceof Error
                  ? err.message
                  : 'Биометрик нэвтрэлтийг идэвхжүүлж чадсангүй. Дараа дахин оролдоно уу.';
              Alert.alert('Алдаа', message, [{ text: 'OK', onPress: onSkip }]);
            });
        },
      },
    ],
  );
}

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signInMutation = useSignInMutation();
  const facebookMutation = useFacebookSignInMutation();

  const refreshBiometricState = useCallback(async () => {
    await repairBiometricLoginState();
    const savedEmail = await getBiometricLoginEmail();
    if (savedEmail) {
      setEmail((current) => current || savedEmail);
    }
    if (__DEV__) {
      await logBiometricDebugState();
    }
  }, []);

  useEffect(() => {
    void refreshBiometricState();
  }, [refreshBiometricState]);

  useFocusEffect(
    useCallback(() => {
      void refreshBiometricState();
    }, [refreshBiometricState]),
  );

  const isBusy = signInMutation.isPending || facebookMutation.isPending;
  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !isBusy;

  const errorText = useMemo(() => {
    if (signInMutation.error) return mapAuthError(signInMutation.error);
    if (facebookMutation.error) return mapAuthError(facebookMutation.error);
    return null;
  }, [signInMutation.error, facebookMutation.error]);

  const goHome = () => {
    router.replace('/home');
  };

  const maybeOfferBiometric = async (session: Session, signedInEmail: string) => {
    await repairBiometricLoginState();
    const support = await getBiometricSupport();
    if (!support.available) {
      goHome();
      return;
    }
    const alreadyEnabled = await canUseBiometricLogin();
    if (alreadyEnabled) {
      goHome();
      return;
    }
    promptEnableBiometric(
      session,
      signedInEmail,
      support.label,
      goHome,
      () => {
        void refreshBiometricState();
        goHome();
      },
    );
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const trimmedEmail = email.trim();
    signInMutation.mutate(
      { email: trimmedEmail, password },
      {
        onSuccess: (session) => {
          void maybeOfferBiometric(session, trimmedEmail);
        },
      },
    );
  };

  const handleFacebook = () => {
    if (isBusy) return;
    facebookMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.status === 'success') {
          router.replace('/home');
        }
      },
    });
  };

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
            <Text className="text-xl font-bold text-vinyl-black">Пянз Толгойт</Text>
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-[#757575]">
              Цахим шуудан
            </Text>
            <View className="rounded-xl bg-[#F2F0EF] px-4 py-3">
              <TextInput
                value={email}
                onChangeText={(value) => {
                  if (signInMutation.error) signInMutation.reset();
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
                className="text-base text-vinyl-black"
                accessibilityLabel="Цахим шуудан"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-[#757575]">
              Нууц үг
            </Text>
            <View className="flex-row items-center rounded-xl bg-[#F2F0EF] px-4 py-3">
              <TextInput
                value={password}
                onChangeText={(value) => {
                  if (signInMutation.error) signInMutation.reset();
                  setPassword(value);
                }}
                placeholder="••••••••"
                placeholderTextColor="#A1A1A1"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                editable={!isBusy}
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
                className="flex-1 text-base text-vinyl-black"
                accessibilityLabel="Нууц үг"
              />
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/forgot-password',
                    params: email.trim() ? { email: email.trim() } : {},
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Нууц үг мартсан"
                hitSlop={8}
              >
                <Text className="text-xs text-[#757575]">Мартсан?</Text>
              </Pressable>
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
            accessibilityLabel="Нэвтрэх"
            accessibilityState={{
              disabled: !canSubmit,
              busy: signInMutation.isPending,
            }}
            className={`mb-6 h-14 flex-row items-center justify-center rounded-xl ${
              canSubmit ? 'bg-vinyl-black' : 'bg-vinyl-black/50'
            }`}
          >
            {signInMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-bold text-white">Нэвтрэх</Text>
            )}
          </Pressable>

          <View className="mb-6 flex-row items-center">
            <View className="h-px flex-1 bg-[#E5E5E5]" />
            <Text className="mx-3 text-xs text-[#757575]">эсвэл</Text>
            <View className="h-px flex-1 bg-[#E5E5E5]" />
          </View>

          <Pressable
            onPress={handleFacebook}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Facebook-ээр нэвтрэх"
            accessibilityState={{
              disabled: isBusy,
              busy: facebookMutation.isPending,
            }}
            className={`h-14 flex-row items-center justify-center rounded-xl border border-[#E5E5E5] bg-white ${
              isBusy ? 'opacity-70' : ''
            }`}
          >
            {facebookMutation.isPending ? (
              <ActivityIndicator color="#1877F2" />
            ) : (
              <>
                <FacebookLogo size={20} color="#1877F2" />
                <Text className="ml-2 text-base font-bold text-vinyl-black">
                  Facebook-ээр нэвтрэх
                </Text>
              </>
            )}
          </Pressable>

          <View className="mt-8 flex-row items-center justify-center">
            <Text className="text-sm text-vinyl-black">Бүртгэлгүй юу? </Text>
            <Link href="/sign-up" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Бүртгүүлэх">
                <Text className="text-sm font-bold text-vinyl-black">
                  Бүртгүүлэх
                </Text>
              </Pressable>
            </Link>
          </View>

          <DebugBootStrip />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
