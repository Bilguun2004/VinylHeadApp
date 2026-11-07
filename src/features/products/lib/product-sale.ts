export function isOnSale(product: {
  price: number;
  discount_price: number | null;
}): boolean {
  const list = Number(product.price);
  const discount =
    product.discount_price != null ? Number(product.discount_price) : null;
  return (
    discount != null &&
    !Number.isNaN(discount) &&
    discount > 0 &&
    discount < list
  );
}

/** Price the shopper pays: sale price when the product is on sale, otherwise list price. */
export function sellingPrice(product: {
  price: number;
  discount_price: number | null;
}): number {
  if (isOnSale(product) && product.discount_price != null) {
    return Number(product.discount_price);
  }
  const list = Number(product.price);
  return Number.isFinite(list) ? list : 0;
}

export type PriceSortDirection = 'asc' | 'desc';

/**
 * Available products first, then by selling price.
 * Unavailable products stay at the bottom in both directions.
 */
export function sortProductsByAvailabilityAndPrice<
  T extends {
    price: number;
    discount_price: number | null;
    available: boolean | null;
  },
>(products: T[], direction: PriceSortDirection = 'asc'): T[] {
  const priceSign = direction === 'asc' ? 1 : -1;
  return [...products].sort((a, b) => {
    const availabilityRank =
      Number(isProductAvailable(b)) - Number(isProductAvailable(a));
    if (availabilityRank !== 0) return availabilityRank;
    return (sellingPrice(a) - sellingPrice(b)) * priceSign;
  });
}

export function isProductAvailable(product: {
  available?: boolean | null;
}): boolean {
  return product.available !== false;
}

export function isSaleProductAvailable(product: {
  price: number;
  discount_price: number | null;
  available: boolean | null;
}): boolean {
  return isOnSale(product) && isProductAvailable(product);
}

export function partitionSaleProducts<
  T extends {
    price: number;
    discount_price: number | null;
    available: boolean | null;
  },
>(products: T[]): { products: T[]; showTab: boolean } {
  const available = products.filter(isSaleProductAvailable);
  return {
    products: available,
    showTab: available.length > 0,
  };
}
