import { compressProductImageForUpload } from '../../admin/lib/compress-product-image';
import { supabase } from '../../../lib/supabase';

const BUCKET = 'profile-avatars';

export async function uploadProfileAvatarFromUri(params: {
  localUri: string;
  userId: string;
}): Promise<string> {
  const { localUri, userId } = params;
  const preparedUri = await compressProductImageForUpload(localUri);
  const res = await fetch(preparedUri);
  if (!res.ok) {
    throw new Error('Зургийг уншиж чадсангүй.');
  }
  const buf = await res.arrayBuffer();
  const path = `${userId}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
