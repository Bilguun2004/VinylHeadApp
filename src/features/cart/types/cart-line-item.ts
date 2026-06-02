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
};

export type CartProductOptionSelection = {
  optionId: string;
  optionLabel: string;
};
