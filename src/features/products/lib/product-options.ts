import type { Json } from '../../../types/supabase';

export type ProductOptionValue = {
  id: string;
  label: string;
  imageUrl: string | null;
  available: boolean;
};

export type ProductOptionDraft = {
  id: string;
  label: string;
  imageIndex: number | null;
  available: boolean;
};

export type ProductOptionsConfig = {
  enabled: boolean;
  label: string;
  options: ProductOptionValue[];
};

const DEFAULT_OPTIONS_LABEL = 'Сонголт';

export function newOptionId(): string {
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newOptionDraft(): ProductOptionDraft {
  return {
    id: newOptionId(),
    label: '',
    imageIndex: null,
    available: true,
  };
}

function parseOptionEntry(raw: unknown): ProductOptionValue | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const label = typeof o.label === 'string' ? o.label.trim() : '';
  if (label.length === 0) return null;
  const id =
    typeof o.id === 'string' && o.id.trim().length > 0
      ? o.id.trim()
      : newOptionId();
  const imageUrl =
    typeof o.image_url === 'string' && o.image_url.trim().length > 0
      ? o.image_url.trim()
      : null;
  const available = o.available !== false;
  return { id, label, imageUrl, available };
}

export function parseProductOptions(
  json: Json | null | undefined,
): ProductOptionValue[] {
  if (!Array.isArray(json)) return [];
  const out: ProductOptionValue[] = [];
  for (const entry of json) {
    const parsed = parseOptionEntry(entry);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function readProductOptionsConfig(product: {
  options_enabled?: boolean | null;
  options_label?: string | null;
  product_options?: Json | null;
}): ProductOptionsConfig {
  const options = parseProductOptions(product.product_options ?? null);
  const label = product.options_label?.trim() || DEFAULT_OPTIONS_LABEL;
  return {
    enabled: product.options_enabled === true && options.length > 0,
    label,
    options,
  };
}

/** Map saved option image URLs back to current upload slot indices. */
export function productOptionsToDrafts(
  options: ProductOptionValue[],
  slotUris: string[],
): ProductOptionDraft[] {
  return options.map((opt) => {
    let imageIndex: number | null = null;
    if (opt.imageUrl) {
      const idx = slotUris.findIndex((uri) => uri === opt.imageUrl);
      if (idx >= 0) imageIndex = idx;
    }
    return {
      id: opt.id,
      label: opt.label,
      imageIndex,
      available: opt.available,
    };
  });
}

export function clampOptionDraftImageIndices(
  drafts: ProductOptionDraft[],
  slotCount: number,
): ProductOptionDraft[] {
  return drafts.map((d) => ({
    ...d,
    imageIndex:
      d.imageIndex != null && d.imageIndex >= 0 && d.imageIndex < slotCount
        ? d.imageIndex
        : null,
  }));
}

function resolveDraftImageUrl(
  imageIndex: number | null,
  resolvedSlotUrls: string[],
): string | null {
  if (imageIndex == null || imageIndex < 0 || imageIndex >= resolvedSlotUrls.length) {
    return null;
  }
  const url = resolvedSlotUrls[imageIndex]?.trim() ?? '';
  return url.length > 0 ? url : null;
}

export function buildProductOptionsFromDrafts(
  enabled: boolean,
  label: string,
  drafts: ProductOptionDraft[],
  resolvedSlotUrls: string[],
  existing: ProductOptionValue[] = [],
): {
  options_enabled: boolean;
  options_label: string | null;
  product_options: Json;
} {
  if (!enabled) {
    return {
      options_enabled: false,
      options_label: null,
      product_options: [] as Json,
    };
  }

  const trimmedLabel = label.trim() || DEFAULT_OPTIONS_LABEL;
  const usedIds = new Set<string>();
  const options: ProductOptionValue[] = [];

  for (const draft of drafts) {
    const optionLabel = draft.label.trim();
    if (optionLabel.length === 0) continue;

    const matchById = existing.find((e) => e.id === draft.id);
    const match =
      matchById ??
      existing.find(
        (e) => e.label.toLowerCase() === optionLabel.toLowerCase(),
      );

    let id = draft.id.trim() || match?.id || newOptionId();
    while (usedIds.has(id)) {
      id = newOptionId();
    }
    usedIds.add(id);

    options.push({
      id,
      label: optionLabel,
      imageUrl: resolveDraftImageUrl(draft.imageIndex, resolvedSlotUrls),
      available: draft.available,
    });
  }

  if (options.length === 0) {
    return {
      options_enabled: false,
      options_label: null,
      product_options: [] as Json,
    };
  }

  const product_options = options.map((o) => ({
    id: o.id,
    label: o.label,
    image_url: o.imageUrl,
    available: o.available,
  })) as unknown as Json;

  return {
    options_enabled: true,
    options_label: trimmedLabel,
    product_options,
  };
}
