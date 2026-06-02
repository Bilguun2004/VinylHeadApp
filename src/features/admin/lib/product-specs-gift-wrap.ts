import type { Json } from '../../../types/supabase';

export type GiftWrapPrices = {
  giftWrapPrice: number;
  giftWrapDiscountPrice: number;
};

function readNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export function readGiftWrapFromSpecs(specs: Json | null): GiftWrapPrices {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) {
    return { giftWrapPrice: 0, giftWrapDiscountPrice: 0 };
  }
  const o = specs as Record<string, unknown>;
  return {
    giftWrapPrice: readNumber(o.gift_wrap_price),
    giftWrapDiscountPrice: readNumber(o.gift_wrap_discount_price),
  };
}

export function mergeGiftWrapIntoSpecs(
  existing: Json | null,
  gift: GiftWrapPrices,
): Json {
  const base: Record<string, unknown> =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  base.gift_wrap_price = gift.giftWrapPrice;
  base.gift_wrap_discount_price = gift.giftWrapDiscountPrice;

  return base as Json;
}
