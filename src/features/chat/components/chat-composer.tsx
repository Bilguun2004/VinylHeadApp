import { ImagePlus, SendHorizontal } from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type ChatComposerProps = {
  text: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  canSend: boolean;
  isSending: boolean;
  localImageUri: string | null;
  onClearImage: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ChatComposer({
  text,
  onChangeText,
  onSend,
  onPickImage,
  canSend,
  isSending,
  localImageUri,
  onClearImage,
  style,
}: ChatComposerProps) {
  return (
    <View className="px-6 pb-3 pt-2" style={style}>
      {localImageUri ? (
        <View className="mb-2 flex-row items-center justify-between rounded-xl bg-[#F2F0EF] px-3.5 py-3">
          <Text className="text-sm text-vinyl-muted">Зураг сонгосон</Text>
          <Pressable
            onPress={onClearImage}
            accessibilityRole="button"
            accessibilityLabel="Зураг устгах"
            hitSlop={8}
          >
            <Text className="text-sm font-semibold text-vinyl-black">Устгах</Text>
          </Pressable>
        </View>
      ) : null}

      <View className="flex-row items-end rounded-xl bg-[#F2F0EF] px-3.5 py-4">
        <Pressable
          onPress={onPickImage}
          disabled={isSending}
          accessibilityRole="button"
          accessibilityLabel="Зураг нэмэх"
          hitSlop={8}
          className="pb-0.5"
        >
          <ImagePlus size={16} color="#757575" />
        </Pressable>

        <TextInput
          value={text}
          onChangeText={onChangeText}
          placeholder="Мессеж бичих..."
          placeholderTextColor="#A1A1A1"
          multiline
          editable={!isSending}
          className="ml-2 mr-2 max-h-24 flex-1 py-0 text-sm leading-5 text-vinyl-black"
          accessibilityLabel="Мессеж"
        />

        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Илгээх"
          accessibilityState={{ disabled: !canSend, busy: isSending }}
          hitSlop={8}
          className="pb-0.5"
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#757575" />
          ) : (
            <SendHorizontal size={16} color={canSend ? '#0A0A0A' : '#A1A1A1'} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
