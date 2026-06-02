import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import { Image, Platform } from 'react-native';

/** Longest edge in px; keeps photos sharp on phones while cutting megapixel bloat. */
const MAX_EDGE_PX = 2048;

/**
 * JPEG 0.88: strong size reduction with minimal visible loss on product shots.
 * (1 = largest file / least compression in expo-image-manipulator.)
 */
const JPEG_QUALITY = 0.88;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => {
        resolve({ width, height });
      },
      (err) => {
        reject(err instanceof Error ? err : new Error('Image.getSize failed'));
      },
    );
  });
}

/**
 * Downscales large images (longest edge capped) and re-encodes as JPEG for smaller uploads.
 * On web, returns the original URI (manipulator pipeline differs).
 */
export async function compressProductImageForUpload(
  localUri: string,
): Promise<string> {
  if (Platform.OS === 'web') {
    return localUri;
  }

  try {
    const { width, height } = await getImageSize(localUri);
    const longer = Math.max(width, height);
    const actions: Action[] = [];

    if (longer > MAX_EDGE_PX) {
      if (width >= height) {
        actions.push({ resize: { width: MAX_EDGE_PX } });
      } else {
        actions.push({ resize: { height: MAX_EDGE_PX } });
      }
    }

    const result = await manipulateAsync(localUri, actions, {
      compress: JPEG_QUALITY,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return localUri;
  }
}
