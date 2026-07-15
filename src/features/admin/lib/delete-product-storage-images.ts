import { supabase } from '../../../lib/supabase';
import type { Json } from '../../../types/supabase';
import { parseProductOptions } from '../../products/lib/product-options';
import { readGalleryUrlsFromSpecs } from './product-specs-gallery';

const BUCKET = 'product-images';

export type ProductImageSource = {
  image_url: string | null;
  specs: Json | null;
  product_options: Json;
};

function productImageUrlToStoragePath(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  try {
    const parsed = new URL(trimmed);
    const marker = `/object/public/${BUCKET}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export function collectProductImageUrls(product: ProductImageSource): string[] {
  const urls = new Set<string>();

  const main = product.image_url?.trim();
  if (main) urls.add(main);

  for (const galleryUrl of readGalleryUrlsFromSpecs(product.specs)) {
    urls.add(galleryUrl);
  }

  for (const option of parseProductOptions(product.product_options)) {
    if (option.imageUrl) urls.add(option.imageUrl);
  }

  return [...urls];
}

export async function deleteProductStorageImages(
  product: ProductImageSource,
): Promise<void> {
  const paths = collectProductImageUrls(product)
    .map(productImageUrlToStoragePath)
    .filter((path): path is string => path != null);

  if (paths.length === 0) return;

  const uniquePaths = [...new Set(paths)];
  const { error } = await supabase.storage.from(BUCKET).remove(uniquePaths);
  if (error) throw error;
}
