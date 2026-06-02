export const reviewKeys = {
  all: ['product-reviews'] as const,
  byProduct: (productId: string) =>
    [...reviewKeys.all, 'product', { productId }] as const,
  canReview: (productId: string, userId: string) =>
    [...reviewKeys.all, 'can-review', { productId, userId }] as const,
};
