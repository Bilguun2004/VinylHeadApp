



import { ActivityIndicator, Pressable, Text } from 'react-native';

type GuestModeButtonProps = {
    onPress: () => void;
    disabled?: boolean;
    busy?: boolean;
    label?: string;
};

const BUTTON_CLASS =
    'h-16 flex-row items-center justify-center rounded-xl border border-[#E5E5E5] bg-white';

export function GuestModeButton({
    onPress,
    disabled = false,
    busy = false,
    label = 'Зочин горим',
}: GuestModeButtonProps) {
    const isDisabled = disabled || busy;

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: isDisabled, busy }}
            className={`${BUTTON_CLASS} ${isDisabled ? 'opacity-70' : ''}`}
        >
            {busy ? (
                <ActivityIndicator color="#1A1A1A" />
            ) : (
                <>
                    <Text className="ml-2 text-base font-bold text-vinyl-black">{label}</Text>
                </>
            )}
        </Pressable>
    );
}
