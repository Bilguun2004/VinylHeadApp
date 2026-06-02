import { readGiftWrapFromSpecs } from '../../admin/lib/product-specs-gift-wrap';
import type { Json } from '../../../types/supabase';

export function productDisplayPrice(product: {
  price: number;
  discount_price: number | null;
}): number {
  const list = Number(product.price);
  const discount =
    product.discount_price != null ? Number(product.discount_price) : null;
  if (
    discount != null &&
    !Number.isNaN(discount) &&
    discount > 0 &&
    discount < list
  ) {
    return discount;
  }
  return list;
}

export function giftWrapExtraFromSpecs(specs: Json | null): number {
  const gift = readGiftWrapFromSpecs(specs);
  const list = gift.giftWrapPrice > 0 ? gift.giftWrapPrice : 15_000;
  const discount = gift.giftWrapDiscountPrice;
  if (discount > 0 && discount < list) return discount;
  return list;
}

export function laserExtraFromSpecs(specs: Json | null): number {
  const DEFAULT = 25_000;
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) {
    return DEFAULT;
  }
  const raw = (specs as Record<string, unknown>).laser_print_price;
  if (typeof raw === 'number' && !Number.isNaN(raw) && raw > 0) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT;
}

export type CartLinePricing = {
  unitPrice: number;
  quantity: number;
  giftWrapExtra: number;
  laserExtra: number;
  laserEnabled: boolean;
  giftOptionId: string | null;
};

export function lineItemTotal(line: CartLinePricing): number {
  const laser = line.laserEnabled ? line.laserExtra : 0;
  const gift = line.giftOptionId != null ? line.giftWrapExtra : 0;
  return line.unitPrice * line.quantity + gift + laser;
}

export function cartSubtotal(lines: CartLinePricing[]): number {
  return lines.reduce((sum, line) => sum + lineItemTotal(line), 0);
}
