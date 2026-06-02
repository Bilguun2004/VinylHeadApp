import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CartLineItem } from '../types/cart-line-item';

const CART_KEY = 'vinylhead:cart';

export async function loadCartFromStorage(): Promise<CartLineItem[]> {
  const raw = await AsyncStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartLineItem).map((line) => ({
      ...line,
      giftOptionImageUrl:
        typeof line.giftOptionImageUrl === 'string'
          ? line.giftOptionImageUrl
          : null,
      productOptionId:
        typeof line.productOptionId === 'string' ? line.productOptionId : null,
      productOptionLabel:
        typeof line.productOptionLabel === 'string'
          ? line.productOptionLabel
          : null,
    }));
  } catch {
    return [];
  }
}

export async function saveCartToStorage(lines: CartLineItem[]): Promise<void> {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(lines));
}

function isCartLineItem(value: unknown): value is CartLineItem {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.lineId === 'string' &&
    typeof o.productId === 'string' &&
    typeof o.title === 'string' &&
    typeof o.unitPrice === 'number' &&
    typeof o.quantity === 'number' &&
    (o.giftOptionImageUrl === undefined ||
      o.giftOptionImageUrl === null ||
      typeof o.giftOptionImageUrl === 'string')
  );
}
