export const INSTAGRAM_STORY_FONTS = [
  { id: 'modern', label: 'Modern', family: 'Gabarito_400Regular' },
  { id: 'classic', label: 'Classic', family: 'InstrumentSans_400Regular' },
  { id: 'typewriter', label: 'Typewriter', family: 'CourierPrime_400Regular' },
  { id: 'strong', label: 'Strong', family: 'RacingSansOne_400Regular' },
  { id: 'meme', label: 'Meme', family: 'Anton_400Regular' },
  { id: 'elegant', label: 'Elegant', family: 'AnticDidone_400Regular' },
  { id: 'directional', label: 'Directional', family: 'Lexend_400Regular' },
  { id: 'literature', label: 'Literature', family: 'Cormorant_400Regular' },
  { id: 'simple', label: 'Simple', family: 'Roboto_400Regular' },
  { id: 'signature', label: 'Signature', family: 'MarckScript_400Regular' },
  { id: 'editor', label: 'Editor', family: 'JetBrainsMono_400Regular' },
  { id: 'bubble', label: 'Bubble', family: 'Coiny_400Regular' },
  { id: 'deco', label: 'Deco', family: 'Quicksand_400Regular' },
  { id: 'poster', label: 'Poster', family: 'GravitasOne_400Regular' },
  { id: 'squeeze', label: 'Squeeze', family: 'FjallaOne_400Regular' },
] as const;

export type InstagramStoryFontId = (typeof INSTAGRAM_STORY_FONTS)[number]['id'];

export const DEFAULT_INSTAGRAM_STORY_FONT_ID: InstagramStoryFontId = 'modern';

const fontById = new Map(
  INSTAGRAM_STORY_FONTS.map((font) => [font.id, font] as const),
);

export function getInstagramStoryFont(id: InstagramStoryFontId) {
  return fontById.get(id) ?? INSTAGRAM_STORY_FONTS[0];
}

export function getInstagramStoryFontFamily(id: InstagramStoryFontId): string {
  return getInstagramStoryFont(id).family;
}

export function getInstagramStoryFontLabel(id: InstagramStoryFontId): string {
  return getInstagramStoryFont(id).label;
}

export function parseInstagramStoryFontId(
  value: string | null | undefined,
): InstagramStoryFontId {
  if (!value?.trim()) return DEFAULT_INSTAGRAM_STORY_FONT_ID;
  const byId = fontById.get(value as InstagramStoryFontId);
  if (byId) return byId.id;
  const byLabel = INSTAGRAM_STORY_FONTS.find(
    (font) => font.label.toLowerCase() === value.trim().toLowerCase(),
  );
  return byLabel?.id ?? DEFAULT_INSTAGRAM_STORY_FONT_ID;
}
