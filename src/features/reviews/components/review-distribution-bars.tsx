import { Text, View } from 'react-native';

import type { ReviewDistributionRow } from '../lib/review-stats';

type ReviewDistributionBarsProps = {
  distribution: ReviewDistributionRow[];
};

export function ReviewDistributionBars({ distribution }: ReviewDistributionBarsProps) {
  return (
    <View className="mt-4 w-full gap-2">
      {distribution.map((row) => (
        <View key={row.stars} className="flex-row items-center gap-2">
          <Text className="w-10 text-xs text-vinyl-muted">{row.stars} од</Text>
          <View className="h-2 flex-1 overflow-hidden rounded-full bg-vinyl-divider">
            <View
              className="h-full rounded-full bg-vinyl-black"
              style={{ width: `${row.percent}%` }}
            />
          </View>
          <Text className="w-10 text-right text-xs text-vinyl-muted">{row.percent}%</Text>
        </View>
      ))}
    </View>
  );
}
