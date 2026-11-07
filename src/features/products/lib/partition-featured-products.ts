import { isProductAvailable } from './product-sale';

export function partitionFeaturedProducts<
  T extends { is_featured?: boolean | null; available?: boolean | null },
>(
  products: T[],
): { featured: T[]; regular: T[] } {
  const featured: T[] = [];
  const regular: T[] = [];

  for (const product of products) {
    if (product.is_featured === true && isProductAvailable(product)) {
      featured.push(product);
    } else {
      regular.push(product);
    }
  }

  return { featured, regular };
}
