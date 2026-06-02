import { compressProductImageForUpload } from '../../admin/lib/compress-product-image';
import { supabase } from '../../../lib/supabase';

const BUCKET = 'review-images';

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function uploadReviewImageFromUri(params: {
  localUri: string;
  userId: string;
  reviewId: string;
}): Promise<string> {
  const { localUri, userId, reviewId } = params;
  const preparedUri = await compressProductImageForUpload(localUri);
  const res = await fetch(preparedUri);
  if (!res.ok) {
    throw new Error('Зургийг уншиж чадсангүй.');
  }
  const buf = await res.arrayBuffer();
  const path = `${userId}/reviews/${reviewId}/${randomSuffix()}.jpg`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
