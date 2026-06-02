import type { Json } from '../../../types/supabase';

export const GALLERY_IMAGE_URLS_KEY = 'gallery_image_urls' as const;

export function readGalleryUrlsFromSpecs(specs: Json | null): string[] {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return [];
  const v = (specs as Record<string, unknown>)[GALLERY_IMAGE_URLS_KEY];
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  );
}

export function mergeGalleryUrlsIntoSpecs(
  existing: Json | null,
  galleryUrls: string[],
): Json {
  const base: Record<string, unknown> =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  if (galleryUrls.length > 0) {
    base[GALLERY_IMAGE_URLS_KEY] = galleryUrls;
  } else {
    delete base[GALLERY_IMAGE_URLS_KEY];
  }

  return base as Json;
}
