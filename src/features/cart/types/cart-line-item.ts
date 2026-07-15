import type { InstagramStoryFontId } from '../../products/lib/instagram-story-fonts';

export type CartLineItem = {
  lineId: string;
  productId: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  giftOptionId: string | null;
  giftOptionName: string | null;
  giftOptionImageUrl: string | null;
  giftWrapExtra: number;
  productOptionId: string | null;
  productOptionLabel: string | null;
  laserEnabled: boolean;
  laserExtra: number;
  laserImageUri: string | null;
  laserPrintText: string;
  laserPrintFont: InstagramStoryFontId;
  laserPrintNote: string;
};

export type CartGiftSelection = {
  optionId: string;
  optionName: string;
  imageUrl: string | null;
  extra: number;
};

export type CartLaserSelection = {
  extra: number;
  imageUri: string | null;
  printText: string;
  printFont: InstagramStoryFontId;
  note: string;
};

export type CartProductOptionSelection = {
  optionId: string;
  optionLabel: string;
};
