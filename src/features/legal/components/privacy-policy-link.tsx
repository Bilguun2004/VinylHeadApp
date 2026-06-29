import { Linking, Pressable, Text, View } from 'react-native';

import { getPrivacyPolicyUrl } from '../../../lib/legal-urls';

type PrivacyPolicyLinkProps = {
  /** Optional helper line shown above the link (e.g. on sign-up). */
  helperText?: string;
  className?: string;
};

export function PrivacyPolicyLink({
  helperText,
  className = 'mt-6 items-center py-2',
}: PrivacyPolicyLinkProps) {
  const privacyPolicyUrl = getPrivacyPolicyUrl();
  if (!privacyPolicyUrl) return null;

  const openPolicy = () => {
    void Linking.openURL(privacyPolicyUrl);
  };

  return (
    <View className={className}>
      {helperText ? (
        <Text className="mb-2 text-center text-xs text-vinyl-muted">
          {helperText}
        </Text>
      ) : null}
      <Pressable
        onPress={openPolicy}
        accessibilityRole="link"
        accessibilityLabel="Нууцлалын бодлого"
      >
        <Text className="text-sm text-vinyl-muted underline">
          Нууцлалын бодлого
        </Text>
      </Pressable>
    </View>
  );
}
