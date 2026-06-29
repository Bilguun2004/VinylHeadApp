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

export function isProductAvailable(product: {
  available: boolean | null;
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
