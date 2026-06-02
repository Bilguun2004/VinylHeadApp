import { supabase } from '../../../lib/supabase';
import { compressProductImageForUpload } from './compress-product-image';

const BUCKET = 'product-images';

function guessContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function extForContentType(contentType: string): string {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/gif') return 'gif';
  return 'jpg';
}

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function uploadProductImageFromUri(params: {
  localUri: string;
  ownerUserId: string;
}): Promise<string> {
  const { localUri, ownerUserId } = params;
  const preparedUri = await compressProductImageForUpload(localUri);
  const res = await fetch(preparedUri);
  if (!res.ok) {
    throw new Error('Зургийг уншиж чадсангүй.');
  }
  const buf = await res.arrayBuffer();
  const contentType = guessContentType(preparedUri);
  const ext = extForContentType(contentType);
  const path = `${ownerUserId}/${randomSuffix()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, {
      contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
