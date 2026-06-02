import { Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

const STAR_COLOR = '#F5B301';
const STAR_EMPTY = '#D4D4D4';

type StarRatingProps = {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
};

export function StarRating({
  rating,
  size = 16,
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View className="flex-row items-center gap-0.5">
      {stars.map((star) => {
        const filled = star <= Math.round(rating);
        const icon = (
          <Star
            key={star}
            size={size}
            color={filled ? STAR_COLOR : STAR_EMPTY}
            fill={filled ? STAR_COLOR : 'transparent'}
          />
        );

        if (!interactive || !onRatingChange) {
          return <View key={star}>{icon}</View>;
        }

        return (
          <Pressable
            key={star}
            onPress={() => onRatingChange(star)}
            accessibilityRole="button"
            accessibilityLabel={`${star} од`}
            hitSlop={4}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}
