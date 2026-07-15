import type { ProductWithCategory } from '../../products/api/use-product-query';
import {
  DEFAULT_INSTAGRAM_STORY_FONT_ID,
} from '../../products/lib/instagram-story-fonts';
import type {
  CartGiftSelection,
  CartLaserSelection,
  CartLineItem,
  CartProductOptionSelection,
} from '../types/cart-line-item';
import {
  giftWrapExtraFromSpecs,
  laserExtraFromSpecs,
  productDisplayPrice,
} from './cart-pricing';
function productSubtitle(product: ProductWithCategory): string {
  const cat = product.categories?.name ?? '';
  if (cat && product.artist) return `${product.artist} • ${cat}`;
  return product.artist || cat || '';
}

function newLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type BuildCartLineParams = {
  product: ProductWithCategory;
  gift?: CartGiftSelection | null;
  productOption?: CartProductOptionSelection | null;
  laser?: CartLaserSelection | null;
};

export function buildCartLineItem(params: BuildCartLineParams): CartLineItem {
  const { product, gift = null, productOption = null, laser = null } = params;
  const specs = product.specs;

  return {
    lineId: newLineId(),
    productId: product.id,
    title: product.title,
    subtitle: productSubtitle(product),
    imageUrl: product.image_url,
    unitPrice: productDisplayPrice(product),
    quantity: 1,
    giftOptionId: gift?.optionId ?? null,
    giftOptionName: gift?.optionName ?? null,
    giftOptionImageUrl: gift?.imageUrl ?? null,
    giftWrapExtra: gift?.extra ?? giftWrapExtraFromSpecs(specs),
    productOptionId: productOption?.optionId ?? null,
    productOptionLabel: productOption?.optionLabel ?? null,
    laserEnabled: laser != null,
    laserExtra: laser?.extra ?? laserExtraFromSpecs(specs),
    laserImageUri: laser?.imageUri ?? null,
    laserPrintText: laser?.printText ?? '',
    laserPrintFont: laser?.printFont ?? DEFAULT_INSTAGRAM_STORY_FONT_ID,
    laserPrintNote: laser?.note ?? '',
  };
}

export function rebuildCartLineItem(
  existing: CartLineItem,
  params: BuildCartLineParams,
): CartLineItem {
  const rebuilt = buildCartLineItem(params);
  return {
    ...rebuilt,
    lineId: existing.lineId,
    quantity: existing.quantity,
  };
}
