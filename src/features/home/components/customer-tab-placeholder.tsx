import { Text, View } from 'react-native';

type CustomerTabPlaceholderProps = {
  title: string;
};

export function CustomerTabPlaceholder({ title }: CustomerTabPlaceholderProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-center text-base font-semibold text-vinyl-black">
        {title}
      </Text>
      <Text className="mt-2 text-center text-sm text-vinyl-muted">
        Удахгүй нэмэгдэнэ.
      </Text>
    </View>
  );
}
