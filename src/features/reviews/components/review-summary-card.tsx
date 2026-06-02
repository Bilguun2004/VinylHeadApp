import { Text, View } from 'react-native';

import type { ReviewSummary } from '../lib/review-stats';
import { ReviewDistributionBars } from './review-distribution-bars';
import { StarRating } from './star-rating';

type ReviewSummaryCardProps = {
  summary: ReviewSummary;
};

export function ReviewSummaryCard({ summary }: ReviewSummaryCardProps) {
  const displayAvg =
    summary.reviewCount > 0 ? summary.averageRating.toFixed(1) : '0';

  return (
    <View className="rounded-2xl bg-white px-5 py-5 shadow-sm">
      <Text className="text-center text-4xl font-bold text-vinyl-black">{displayAvg}</Text>
      <View className="mt-2 items-center">
        <StarRating rating={summary.averageRating} size={20} />
      </View>
      <Text className="mt-2 text-center text-sm text-vinyl-muted">
        {summary.reviewCount} сэтгэгдэл
      </Text>
      <ReviewDistributionBars distribution={summary.distribution} />
    </View>
  );
}
