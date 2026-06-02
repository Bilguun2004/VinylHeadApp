import type { ProductReviewWithDetails } from '../api/use-product-reviews-query';

export type ReviewDistributionRow = {
  stars: number;
  percent: number;
};

export type ReviewSummary = {
  averageRating: number;
  reviewCount: number;
  distribution: ReviewDistributionRow[];
};

export function computeReviewSummary(
  reviews: ProductReviewWithDetails[],
): ReviewSummary {
  const reviewCount = reviews.length;
  if (reviewCount === 0) {
    return {
      averageRating: 0,
      reviewCount: 0,
      distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, percent: 0 })),
    };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Math.round((sum / reviewCount) * 10) / 10;

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    const bucket = Math.min(5, Math.max(1, Math.round(r.rating)));
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }

  const distribution: ReviewDistributionRow[] = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    percent: Math.round(((counts[stars] ?? 0) / reviewCount) * 100),
  }));

  return { averageRating, reviewCount, distribution };
}

export function flattenReviewPhotos(
  reviews: ProductReviewWithDetails[],
): { id: string; imageUrl: string; reviewId: string }[] {
  const photos: { id: string; imageUrl: string; reviewId: string }[] = [];
  for (const review of reviews) {
    const sorted = [...review.images].sort((a, b) => a.sort_order - b.sort_order);
    for (const img of sorted) {
      photos.push({ id: img.id, imageUrl: img.image_url, reviewId: review.id });
    }
  }
  return photos;
}

export function reviewInitial(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return trimmed.slice(0, 1).toUpperCase();
}
