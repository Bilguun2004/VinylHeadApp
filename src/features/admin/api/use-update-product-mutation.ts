import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { Json } from '../../../types/supabase';
import { mergeGalleryUrlsIntoSpecs } from '../lib/product-specs-gallery';
import { mergeGiftWrapIntoSpecs } from '../lib/product-specs-gift-wrap';
import {
  buildProductOptionsFromDrafts,
  type ProductOptionDraft,
  type ProductOptionValue,
} from '../../products/lib/product-options';
import { uploadProductImageFromUri } from '../lib/upload-product-image';
import type { ProductImageSlot } from './use-create-product-mutation';
import { adminProductKeys } from './use-admin-products-query';
import { productKeys } from '../../products/api/use-product-query';

export type UpdateProductInput = {
  id: string;
  title: string;
  categoryId: string | null;
  subCategoryId: string | null;
  description: string | null;
  price: number;
  discountPrice: number;
  giftWrapPrice: number;
  giftWrapDiscountPrice: number;
  isLaserPrintingEnabled: boolean;
  isFeatured: boolean;
  available: boolean;
  optionsEnabled: boolean;
  optionsLabel: string;
  optionDrafts: ProductOptionDraft[];
  existingProductOptions: ProductOptionValue[];
  images: ProductImageSlot[];
  mainImageIndex: number;
  existingSpecs: Json | null;
  ownerUserId: string;
};

function normalizeDiscountPrice(
  listPrice: number,
  discountPrice: number,
): number | null {
  if (!(discountPrice > 0)) return null;
  if (!(discountPrice < listPrice)) return null;
  return discountPrice;
}

async function resolveImageSlotsToUrls(
  slots: ProductImageSlot[],
  ownerUserId: string,
): Promise<string[]> {
  const urls: string[] = [];
  for (const slot of slots) {
    if (slot.kind === 'remote') {
      urls.push(slot.url.trim());
    } else {
      const uploaded = await uploadProductImageFromUri({
        localUri: slot.uri,
        ownerUserId,
      });
      urls.push(uploaded);
    }
  }
  return urls;
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProductInput) => {
      let imageUrl: string | null = null;
      let galleryUrls: string[] = [];

      let resolved: string[] = [];
      if (input.images.length > 0) {
        resolved = await resolveImageSlotsToUrls(
          input.images,
          input.ownerUserId,
        );
        const mainIdx = Math.min(
          Math.max(0, input.mainImageIndex),
          resolved.length - 1,
        );
        imageUrl = resolved[mainIdx] ?? null;
        galleryUrls = resolved.filter((_, i) => i !== mainIdx);
      }

      let specs: Json = mergeGiftWrapIntoSpecs(input.existingSpecs, {
        giftWrapPrice: input.giftWrapPrice,
        giftWrapDiscountPrice: input.giftWrapDiscountPrice,
      });
      specs = mergeGalleryUrlsIntoSpecs(specs, galleryUrls);

      const discount_price = normalizeDiscountPrice(
        input.price,
        input.discountPrice,
      );

      const optionsFields = buildProductOptionsFromDrafts(
        input.optionsEnabled,
        input.optionsLabel,
        input.optionDrafts,
        resolved,
        input.existingProductOptions,
      );

      const { error } = await supabase
        .from('products')
        .update({
          title: input.title.trim(),
          category_id: input.categoryId,
          sub_category_id: input.subCategoryId,
          description: input.description?.trim() || null,
          price: input.price,
          discount_price,
          image_url: imageUrl,
          specs,
          is_laser_printing_enabled: input.isLaserPrintingEnabled,
          is_featured: input.isFeatured,
          available: input.available,
          ...optionsFields,
        })
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      await queryClient.invalidateQueries({
        queryKey: productKeys.detail(variables.id),
      });
    },
  });
}
