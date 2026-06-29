export function partitionFeaturedProducts<
  T extends { is_featured?: boolean | null },
>(
  products: T[],
): { featured: T[]; regular: T[] } {
  const featured: T[] = [];
  const regular: T[] = [];

  for (const product of products) {
    if (product.is_featured === true) {
      featured.push(product);
    } else {
      regular.push(product);
    }
  }

  return { featured, regular };
}
