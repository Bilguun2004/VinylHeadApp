import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { ArrowLeft, Share2, ShoppingCart } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { readGiftWrapFromSpecs } from '../../admin/lib/product-specs-gift-wrap';
import { readGalleryUrlsFromSpecs } from '../../admin/lib/product-specs-gallery';
import { useCart } from '../../cart/context/cart-context';
import {
  giftWrapExtraFromSpecs,
  laserExtraFromSpecs,
} from '../../cart/lib/cart-pricing';
import { useGiftOptionsQuery } from '../api/use-gift-options-query';
import { useProductQuery } from '../api/use-product-query';
import { isProductAvailable } from '../components/product-card';
import {
  ProductGiftWrapCard,
  formatExtraPrice,
  type GiftWrapOption,
  type GiftWrapSelection,
} from '../components/product-gift-wrap-card';
import {
  ProductOptionsCard,
  type ProductOptionSelection,
} from '../components/product-options-card';
import { readProductOptionsConfig } from '../lib/product-options';
import { ProductImageCarousel } from '../components/product-image-carousel';
import {
  ProductLaserPrintCard,
  type LaserPrintSelection,
} from '../components/product-laser-print-card';
import { ProductReviewsSection } from '../../reviews/components/product-reviews-section';
import type { Json } from '../../../types/supabase';
import { debugLog } from '../../../lib/debug-log';
import { navigateToHomeTab } from '../../home/lib/navigate-to-home-tab';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560507074-b9eb43a0c9a4?auto=format&fit=crop&w=1200&q=80';

const DEFAULT_LASER_EXTRA = 25_000;

type ProductSpecs = {
  speed?: string;
  tonearm?: string;
  weight?: string;
};

function formatMnt(amount: number) {
  return `₮${Math.round(amount).toLocaleString('en-US')}`;
}

function coerceSpecs(value: Json | null): ProductSpecs | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as { [key: string]: Json | undefined };

  const rpm = typeof obj.rpm === 'string' ? obj.rpm : undefined;
  const speed = typeof obj.speed === 'string' ? obj.speed : undefined;
  const tonearm = typeof obj.tonearm === 'string' ? obj.tonearm : undefined;
  const weight =
    typeof obj.weight === 'string'
      ? obj.weight
      : typeof obj.weight_kg === 'string'
        ? obj.weight_kg
        : undefined;

  return { speed: rpm ?? speed, tonearm, weight };
}

function readLaserExtraFromSpecs(specs: Json | null): number {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) {
    return DEFAULT_LASER_EXTRA;
  }
  const raw = (specs as Record<string, unknown>).laser_print_price;
  if (typeof raw === 'number' && !Number.isNaN(raw) && raw > 0) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_LASER_EXTRA;
}

function giftWrapDisplayPrice(
  list: number,
  discount: number,
): { amount: number; label: string } {
  const onSale = discount > 0 && discount < list;
  const amount = onSale ? discount : list;
  return { amount, label: formatExtraPrice(amount) };
}

export function ProductScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ id?: string; lineId?: string }>();
  const productId = typeof params.id === 'string' ? params.id : '';
  const cartLineId =
    typeof params.lineId === 'string' ? params.lineId.trim() : '';

  const productQuery = useProductQuery(productId);
  const giftOptionsQuery = useGiftOptionsQuery();
  const { lines, addItem, updateLine, setPendingHomeTab } = useCart();
  const product = productQuery.data;

  const editingCartLine = useMemo(
    () =>
      cartLineId.length > 0
        ? lines.find((l) => l.lineId === cartLineId)
        : undefined,
    [lines, cartLineId],
  );
  const isEditingCartLine = editingCartLine != null;

  const [giftSelection, setGiftSelection] = useState<GiftWrapSelection>({
    enabled: false,
    optionId: null,
  });
  const [optionSelection, setOptionSelection] = useState<ProductOptionSelection>({
    optionId: null,
  });
  const [laserSelection, setLaserSelection] = useState<LaserPrintSelection>({
    enabled: false,
    imageUri: null,
  });
  const hydratedFromCartRef = useRef<string | null>(null);

  useEffect(() => {
    hydratedFromCartRef.current = null;
  }, [cartLineId]);

  useEffect(() => {
    if (isEditingCartLine) return;
    setOptionSelection({ optionId: null });
  }, [productId, isEditingCartLine]);

  useEffect(() => {
    if (!editingCartLine || !product) return;
    if (hydratedFromCartRef.current === editingCartLine.lineId) return;

    setGiftSelection({
      enabled: editingCartLine.giftOptionId != null,
      optionId: editingCartLine.giftOptionId,
    });
    setOptionSelection({
      optionId: editingCartLine.productOptionId,
    });
    setLaserSelection({
      enabled: editingCartLine.laserEnabled,
      imageUri: editingCartLine.laserImageUri,
    });
    hydratedFromCartRef.current = editingCartLine.lineId;
  }, [editingCartLine, product]);

  const specs = useMemo(
    () => coerceSpecs(product?.specs ?? null),
    [product?.specs],
  );

  const productOptionsConfig = useMemo(
    () => (product ? readProductOptionsConfig(product) : null),
    [product],
  );

  const galleryUrls = useMemo(() => {
    const fromSpecs = readGalleryUrlsFromSpecs(product?.specs ?? null);
    const main = product?.image_url?.trim();
    const base =
      main && !fromSpecs.includes(main)
        ? [main, ...fromSpecs]
        : fromSpecs.length > 0
          ? fromSpecs
          : main
            ? [main]
            : [];

    const selectedOption = productOptionsConfig?.options.find(
      (o) => o.id === optionSelection.optionId,
    );
    const optionImage = selectedOption?.imageUrl?.trim();
    if (optionImage && !base.includes(optionImage)) {
      return [optionImage, ...base];
    }
    if (optionImage) {
      return [optionImage, ...base.filter((u) => u !== optionImage)];
    }
    return base;
  }, [
    product?.image_url,
    product?.specs,
    productOptionsConfig?.options,
    optionSelection.optionId,
  ]);

  const giftWrap = useMemo(
    () => readGiftWrapFromSpecs(product?.specs ?? null),
    [product?.specs],
  );

  const giftWrapLabel = useMemo(() => {
    const list =
      giftWrap.giftWrapPrice > 0 ? giftWrap.giftWrapPrice : 15_000;
    const discount = giftWrap.giftWrapDiscountPrice;
    return giftWrapDisplayPrice(list, discount).label;
  }, [giftWrap]);

  const giftWrapOptions = useMemo((): GiftWrapOption[] => {
    return (giftOptionsQuery.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
    }));
  }, [giftOptionsQuery.data]);

  const laserExtraLabel = useMemo(
    () => formatExtraPrice(readLaserExtraFromSpecs(product?.specs ?? null)),
    [product?.specs],
  );

  const showLaser = product?.is_laser_printing_enabled === true;
  const productAvailable = product ? isProductAvailable(product) : false;

  const buildCartPayload = () => {
    if (!product) return null;

    const giftOption =
      giftSelection.enabled && giftSelection.optionId
        ? giftWrapOptions.find((o) => o.id === giftSelection.optionId)
        : null;

    const selectedProductOption =
      productOptionsConfig?.enabled && optionSelection.optionId
        ? productOptionsConfig.options.find(
            (o) => o.id === optionSelection.optionId,
          )
        : null;

    return {
      product,
      productOption: selectedProductOption
        ? {
            optionId: selectedProductOption.id,
            optionLabel: selectedProductOption.label,
          }
        : null,
      gift: giftOption
        ? {
            optionId: giftOption.id,
            optionName: giftOption.name,
            imageUrl: giftOption.imageUrl,
            extra: giftWrapExtraFromSpecs(product.specs),
          }
        : null,
      laser:
        showLaser && laserSelection.enabled
          ? {
              extra: laserExtraFromSpecs(product.specs),
              imageUri: laserSelection.imageUri,
            }
          : null,
    };
  };

  const handleAddToCart = () => {
    // #region agent log
    void debugLog(
      'product-screen.tsx:handleAddToCart',
      'add-to-cart pressed',
      {
        productId,
        productAvailable,
        isEditingCartLine,
        optionId: optionSelection.optionId,
      },
      'H-A',
    );
    // #endregion
    if (!productAvailable) return;

    if (productOptionsConfig?.enabled) {
      if (!optionSelection.optionId) {
        Alert.alert('Сонголт', `${productOptionsConfig.label} сонгоно уу.`);
        return;
      }
      const picked = productOptionsConfig.options.find(
        (o) => o.id === optionSelection.optionId,
      );
      if (picked && !picked.available) {
        Alert.alert('Боломжгүй', 'Энэ сонголт одоогоор боломжгүй байна.');
        return;
      }
    }

    const payload = buildCartPayload();
    if (!payload) return;

    if (isEditingCartLine && editingCartLine) {
      updateLine(editingCartLine.lineId, payload);
    } else {
      addItem(payload);
    }

    // #region agent log
    void debugLog(
      'product-screen.tsx:handleAddToCart',
      'cart updated, navigating to cart tab',
      {
        productId: payload.product.id,
        canGoBack: router.canGoBack(),
      },
      'H-A',
    );
    // #endregion

    navigateToHomeTab(router, pathname, setPendingHomeTab, 'cart');
  };

  const pricing = useMemo(() => {
    if (!product) return null;
    const list = Number(product.price);
    const discount =
      product.discount_price != null ? Number(product.discount_price) : null;
    const onSale =
      discount != null && !Number.isNaN(discount) && discount < list;
    return {
      display: onSale ? discount : list,
      compareAt: onSale ? list : null,
      onSale,
    };
  }, [product]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-vinyl-surface">
        <View className="bg-white px-6 pb-0 pt-2">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Буцах"
              hitSlop={8}
              className="h-10 w-10 items-center justify-center"
            >
              <ArrowLeft size={22} color="#0A0A0A" />
            </Pressable>

            <Image
              source={require('../../../../assets/logo.png')}
              style={{ width: 26, height: 26 }}
              resizeMode="contain"
              accessibilityLabel="VinylHead"
            />

            <Pressable
              onPress={() => {
                // TODO: wire share sheet when product URL is available.
              }}
              accessibilityRole="button"
              accessibilityLabel="Хуваалцах"
              hitSlop={8}
              className="h-10 w-10 items-center justify-center"
            >
              <Share2 size={20} color="#0A0A0A" />
            </Pressable>
          </View>
        </View>

        {productQuery.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : productQuery.isError ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-base font-semibold text-vinyl-black">
              Бүтээгдэхүүн олдсонгүй
            </Text>
            <Text className="mt-2 text-center text-sm text-vinyl-muted">
              Дахин оролдоно уу.
            </Text>
          </View>
        ) : !product || !pricing ? (
          <View className="flex-1" />
        ) : (
          <>
            <ProductImageCarousel
              title={product.title}
              imageUrls={galleryUrls}
              fallbackUri={FALLBACK_IMAGE}
            />

            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-32"
            >
              <View className="bg-vinyl-surface px-6 pt-3">
                <Text className="text-xs font-semibold tracking-wide text-vinyl-muted">
                  {(product.categories?.name ?? 'Бүтээгдэхүүн').toUpperCase()}
                </Text>
                <Text className="mt-2 text-3xl font-extrabold leading-tight text-vinyl-black">
                  {product.title}
                </Text>

                {!productAvailable ? (
                  <View className="mt-3 self-start rounded-md bg-vinyl-muted px-3 py-1.5">
                    <Text className="text-xs font-semibold text-vinyl-paper">
                      Нөөц дууссан
                    </Text>
                  </View>
                ) : null}

                <View className="mt-3 flex-row flex-wrap items-baseline">
                  <Text
                    className={`text-2xl font-bold ${
                      pricing.onSale ? 'text-vinyl-sale' : 'text-vinyl-black'
                    }`}
                  >
                    {formatMnt(pricing.display)}
                  </Text>
                  {typeof pricing.compareAt === 'number' ? (
                    <Text className="ml-3 text-base text-vinyl-muted line-through">
                      {formatMnt(pricing.compareAt)}
                    </Text>
                  ) : null}
                </View>

                {product.description ? (
                  <Text className="mt-4 text-sm leading-6 text-vinyl-muted">
                    {product.description}
                  </Text>
                ) : null}
              </View>

              <View className="gap-4 px-6 pt-6">
                {productOptionsConfig?.enabled ? (
                  <ProductOptionsCard
                    label={productOptionsConfig.label}
                    options={productOptionsConfig.options}
                    selection={optionSelection}
                    onSelectionChange={setOptionSelection}
                  />
                ) : null}
                <ProductGiftWrapCard
                  extraPriceLabel={giftWrapLabel}
                  options={giftWrapOptions}
                  optionsLoading={giftOptionsQuery.isPending}
                  selection={giftSelection}
                  onSelectionChange={setGiftSelection}
                />
                {showLaser ? (
                  <ProductLaserPrintCard
                    extraPriceLabel={laserExtraLabel}
                    selection={laserSelection}
                    onSelectionChange={setLaserSelection}
                  />
                ) : null}

                <ProductReviewsSection productId={product.id} />
              </View>
            </ScrollView>

            <SafeAreaView
              edges={['bottom']}
              className="absolute bottom-0 left-0 right-0 border-t border-vinyl-divider/60 bg-vinyl-surface px-6 pt-3"
            >
              <Pressable
                onPress={handleAddToCart}
                disabled={!productAvailable}
                accessibilityRole="button"
                accessibilityLabel={
                  productAvailable
                    ? isEditingCartLine
                      ? 'Сагс шинэчлэх'
                      : 'Сагсанд хийх'
                    : 'Боломжгүй'
                }
                accessibilityState={{ disabled: !productAvailable }}
                className={`h-14 flex-row items-center justify-center rounded-full ${
                  productAvailable ? 'bg-vinyl-black' : 'bg-vinyl-divider'
                }`}
              >
                <ShoppingCart
                  size={20}
                  color={productAvailable ? '#FFFFFF' : '#6B6B6B'}
                />
                <Text
                  className={`ml-2 text-base font-semibold ${
                    productAvailable ? 'text-white' : 'text-vinyl-muted'
                  }`}
                >
                  {productAvailable
                    ? isEditingCartLine
                      ? 'Сагс шинэчлэх'
                      : 'Сагсанд хийх'
                    : 'Нөөц дууссан'}
                </Text>
              </Pressable>
            </SafeAreaView>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
