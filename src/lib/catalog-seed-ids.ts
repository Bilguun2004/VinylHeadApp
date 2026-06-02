/**
 * Fixed UUIDs for `supabase/seed.sql` so local/dev navigation can target
 * stable product rows before you wire CMS/admin tooling.
 */
export const CATALOG_CATEGORY_IDS = {
  vinyl: '11111111-1111-1111-1111-111111111101',
  turntables: '11111111-1111-1111-1111-111111111102',
  speakers: '11111111-1111-1111-1111-111111111103',
  accessories: '11111111-1111-1111-1111-111111111104',
} as const;

/** Home shop tabs: same IDs as seed rows, excluding accessories and other catalog-only categories. */
export const HOME_NAV_CATEGORY_IDS: readonly string[] = [
  CATALOG_CATEGORY_IDS.vinyl,
  CATALOG_CATEGORY_IDS.turntables,
  CATALOG_CATEGORY_IDS.speakers,
];

export type HomeCategoryTabId = keyof typeof CATALOG_CATEGORY_IDS;

export function getCategoryUuidForTab(tabId: string): string | null {
  if (tabId in CATALOG_CATEGORY_IDS) {
    return CATALOG_CATEGORY_IDS[tabId as HomeCategoryTabId];
  }
  return null;
}
