import { useFonts } from 'expo-font';

import { instagramStoryFontAssets } from '../lib/instagram-story-font-assets';

export function useInstagramStoryFonts() {
  const [loaded, error] = useFonts(instagramStoryFontAssets);
  return { loaded, error };
}
