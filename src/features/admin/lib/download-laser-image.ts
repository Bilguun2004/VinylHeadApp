import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

function extensionFromUrl(url: string): 'png' | 'jpg' | 'webp' {
  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.webp')) return 'webp';
  return 'jpg';
}

function mimeForExt(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function safeSlug(value: string): string {
  const slug = value.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_');
  return slug.slice(0, 48) || 'product';
}

/**
 * Downloads a remote laser-print image to cache and opens the system share/save sheet.
 */
export async function downloadLaserPrintImage(params: {
  imageUrl: string;
  orderNumber: string;
  productTitle: string;
}): Promise<void> {
  const ext = extensionFromUrl(params.imageUrl);
  const filename = `laser-${params.orderNumber}-${safeSlug(params.productTitle)}.${ext}`;
  const dest = `${FileSystem.cacheDirectory ?? ''}${filename}`;

  if (!FileSystem.cacheDirectory) {
    throw new Error('Татаж авах боломжгүй.');
  }

  const result = await FileSystem.downloadAsync(params.imageUrl, dest);
  if (result.status !== 200) {
    throw new Error('Зураг татахад алдаа гарлаа.');
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Энэ төхөөрөмж дээр татаж авах боломжгүй.');
  }

  let shareUri = result.uri;
  if (Platform.OS === 'android') {
    shareUri = await FileSystem.getContentUriAsync(result.uri);
  }

  await Sharing.shareAsync(shareUri, {
    mimeType: mimeForExt(ext),
    dialogTitle: 'Лазер хэвлэлийн зураг',
    UTI: 'public.image',
  });
}
