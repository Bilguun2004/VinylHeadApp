import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronDown,
  ImagePlus,
  Package,
  Printer,
  Star,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { useCategoriesQuery } from '../../products/api/use-categories-query';
import { useAdminCategoryTreeQuery } from '../api/use-admin-sub-categories-query';
import { useProductQuery } from '../../products/api/use-product-query';
import type { Json } from '../../../types/supabase';
import {
  type ProductImageSlot,
  useCreateProductMutation,
} from '../api/use-create-product-mutation';
import { useDeleteProductMutation } from '../api/use-delete-product-mutation';
import { useUpdateProductMutation } from '../api/use-update-product-mutation';
import { readGalleryUrlsFromSpecs } from '../lib/product-specs-gallery';
import { readGiftWrapFromSpecs } from '../lib/product-specs-gift-wrap';
import type { CategoryRow } from '../../products/api/use-categories-query';
import { AdminProductOptionsEditor } from '../components/admin-product-options-editor';
import {
  clampOptionDraftImageIndices,
  newOptionDraft,
  parseProductOptions,
  productOptionsToDrafts,
  type ProductOptionDraft,
} from '../../products/lib/product-options';

function parseMoney(raw: string): number {
  const n = Number(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function moneyToInput(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  return String(Math.round(n));
}

const MAX_PRODUCT_IMAGES = 10;

function slotDisplayUri(slot: ProductImageSlot): string {
  return slot.kind === 'remote' ? slot.url : slot.uri;
}

function buildSlotsFromProduct(product: {
  image_url: string | null;
  specs: Json | null;
}): ProductImageSlot[] {
  const slots: ProductImageSlot[] = [];
  const main = product.image_url?.trim() ?? '';
  if (main.length > 0) {
    slots.push({ kind: 'remote', url: main });
  }
  for (const u of readGalleryUrlsFromSpecs(product.specs)) {
    if (u === main) continue;
    slots.push({ kind: 'remote', url: u });
  }
  return slots;
}

export function AdminAddProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = typeof params.id === 'string' ? params.id : '';

  const nextImagesAfterRemoveRef = useRef<ProductImageSlot[]>([]);

  const sessionQuery = useAuthSessionQuery();
  const session = sessionQuery.data ?? null;
  const ownerUserId = session?.user.id ?? '';

  const categoriesQuery = useCategoriesQuery();
  const categoryTreeQuery = useAdminCategoryTreeQuery();
  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();
  const deleteMutation = useDeleteProductMutation();
  const productQuery = useProductQuery(productId, {
    enabled: !deleteMutation.isPending && !deleteMutation.isSuccess,
  });

  const isEdit = productId.trim().length > 0;
  const product = productQuery.data;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null);
  const [price, setPrice] = useState('0');
  const [discountPrice, setDiscountPrice] = useState('0');
  const [giftWrapPrice, setGiftWrapPrice] = useState('0');
  const [giftWrapDiscountPrice, setGiftWrapDiscountPrice] = useState('0');
  const [laserEnabled, setLaserEnabled] = useState(false);
  const [available, setAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [optionsEnabled, setOptionsEnabled] = useState(false);
  const [optionsLabel, setOptionsLabel] = useState('Өнгө');
  const [optionDrafts, setOptionDrafts] = useState<ProductOptionDraft[]>([]);
  const [images, setImages] = useState<ProductImageSlot[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  useEffect(() => {
    if (!isEdit || !product) return;
    setTitle(product.title);
    setDescription(product.description ?? '');
    setCategoryId(product.category_id);
    setSubCategoryId(product.sub_category_id);
    setPrice(moneyToInput(Number(product.price)));
    setDiscountPrice(
      product.discount_price != null
        ? moneyToInput(Number(product.discount_price))
        : '0',
    );
    const gift = readGiftWrapFromSpecs(product.specs);
    setGiftWrapPrice(moneyToInput(gift.giftWrapPrice));
    setGiftWrapDiscountPrice(moneyToInput(gift.giftWrapDiscountPrice));
    setLaserEnabled(product.is_laser_printing_enabled);
    setAvailable(product.available !== false);
    setIsFeatured(product.is_featured === true);
    setOptionsEnabled(product.options_enabled === true);
    setOptionsLabel(product.options_label?.trim() || 'Өнгө');
    const slots = buildSlotsFromProduct(product);
    setImages(slots);
    setMainImageIndex(0);
    const parsed = parseProductOptions(product.product_options);
    const slotUris = slots.map(slotDisplayUri);
    const drafts = productOptionsToDrafts(parsed, slotUris);
    setOptionDrafts(drafts.length > 0 ? drafts : [newOptionDraft()]);
  }, [isEdit, product]);

  const selectedCategoryName = useMemo(() => {
    const rows = categoriesQuery.data ?? [];
    const hit = rows.find((c) => c.id === categoryId);
    return hit?.name ?? null;
  }, [categoriesQuery.data, categoryId]);

  const subCategoriesForSelected = useMemo(() => {
    const cat = categoryTreeQuery.data?.find((c) => c.id === categoryId);
    return cat?.sub_categories ?? [];
  }, [categoryTreeQuery.data, categoryId]);

  const selectedSubCategoryName = useMemo(() => {
    const hit = subCategoriesForSelected.find((s) => s.id === subCategoryId);
    return hit?.name ?? null;
  }, [subCategoriesForSelected, subCategoryId]);

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    sessionQuery.isPending;

  const onDeleteProduct = () => {
    if (!isEdit || !product) return;

    Alert.alert(
      'Устгах уу?',
      'Энэ бүтээгдэхүүн болон түүний зураг, сонголтуудыг бүр мөсөн устгах болно.',
      [
        { text: 'Цуцлах', style: 'cancel' },
        {
          text: 'Устгах',
          style: 'destructive',
          onPress: () =>
            deleteMutation.mutate(productId, {
              onSuccess: () =>
                Alert.alert('Амжилттай', 'Бүтээгдэхүүн устгагдлаа.', [
                  { text: 'OK', onPress: () => router.back() },
                ]),
              onError: (err) =>
                Alert.alert(
                  'Устгаж чадсангүй',
                  err instanceof Error
                    ? err.message
                    : 'Бүтээгдэхүүнийг устгахад алдаа гарлаа. Дахин оролдоно уу.',
                ),
            }),
        },
      ],
    );
  };

  const pickImages = async () => {
    if (images.length >= MAX_PRODUCT_IMAGES) {
      Alert.alert('Хязгаар', `Хамгийн ихдээ ${MAX_PRODUCT_IMAGES} зураг.`);
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Зөвшөөрөл хэрэгтэй', 'Зургийн сан руу хандах зөвшөөрөл өгнө үү.');
      return;
    }

    const remaining = MAX_PRODUCT_IMAGES - images.length;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });

    if (res.canceled) return;

    const picked: ProductImageSlot[] = [];
    for (const asset of res.assets) {
      if (asset.uri) {
        picked.push({ kind: 'local', uri: asset.uri });
      }
    }
    if (picked.length === 0) return;

    setImages((prev) => {
      const next = [...prev, ...picked].slice(0, MAX_PRODUCT_IMAGES);
      return next;
    });
  };

  const removeImageAt = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      nextImagesAfterRemoveRef.current = next;
      return next;
    });
    setMainImageIndex((m) => {
      const next = nextImagesAfterRemoveRef.current;
      if (next.length === 0) return 0;
      if (index < m) return m - 1;
      return Math.min(m, next.length - 1);
    });
    setOptionDrafts((prev) =>
      clampOptionDraftImageIndices(prev, nextImagesAfterRemoveRef.current.length),
    );
  };

  const onSave = () => {
    if (!ownerUserId) {
      Alert.alert('Алдаа', 'Нэвтрэх шаардлагатай.');
      return;
    }

    const t = title.trim();
    if (t.length === 0) {
      Alert.alert('Алдаа', 'Нэр оруулна уу.');
      return;
    }

    const p = parseMoney(price);
    if (!(p > 0)) {
      Alert.alert('Алдаа', 'Үнэ зөв оруулна уу.');
      return;
    }

    const dp = parseMoney(discountPrice);
    const gwp = parseMoney(giftWrapPrice);
    const gwdp = parseMoney(giftWrapDiscountPrice);

    if (optionsEnabled) {
      const filled = optionDrafts
        .map((d) => d.label.trim())
        .filter((l) => l.length > 0);
      if (filled.length === 0) {
        Alert.alert('Алдаа', 'Дор хаяж нэг сонголтын утга оруулна уу.');
        return;
      }
    }

    const mainIdx =
      images.length === 0
        ? 0
        : Math.min(Math.max(0, mainImageIndex), images.length - 1);

    if (isEdit) {
      updateMutation.mutate(
        {
          id: productId,
          title: t,
          categoryId,
          subCategoryId:
            subCategoriesForSelected.length > 0 ? subCategoryId : null,
          description: description.trim() || null,
          price: p,
          discountPrice: dp,
          giftWrapPrice: gwp,
          giftWrapDiscountPrice: gwdp,
          isLaserPrintingEnabled: laserEnabled,
          isFeatured,
          available,
          optionsEnabled,
          optionsLabel,
          optionDrafts,
          existingProductOptions: parseProductOptions(
            product?.product_options ?? null,
          ),
          images,
          mainImageIndex: mainIdx,
          existingSpecs: product?.specs ?? null,
          ownerUserId,
        },
        {
          onSuccess: () => router.back(),
          onError: (e) =>
            Alert.alert('Хадгалахад алдаа', e instanceof Error ? e.message : ''),
        },
      );
      return;
    }

    createMutation.mutate(
      {
        title: t,
        categoryId,
        subCategoryId:
          subCategoriesForSelected.length > 0 ? subCategoryId : null,
        description: description.trim() || null,
        price: p,
        discountPrice: dp,
        giftWrapPrice: gwp,
        giftWrapDiscountPrice: gwdp,
        isLaserPrintingEnabled: laserEnabled,
        isFeatured,
        available,
        optionsEnabled,
        optionsLabel,
        optionDrafts,
        images,
        mainImageIndex: mainIdx,
        ownerUserId,
      },
      {
        onSuccess: () => router.back(),
        onError: (e) =>
          Alert.alert('Хадгалахад алдаа', e instanceof Error ? e.message : ''),
      },
    );
  };

  const showInitialSpinner =
    isEdit && (productQuery.isPending || (productQuery.isSuccess && !product));

  if (showInitialSpinner) {
    return (
      <SafeAreaView className="flex-1 bg-vinyl-canvas" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (isEdit && productQuery.isError) {
    return (
      <SafeAreaView className="flex-1 bg-vinyl-canvas" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-semibold text-vinyl-black">
            Ачаалж чадсангүй
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Буцах"
            className="mt-4 rounded-2xl bg-vinyl-black px-5 py-3"
          >
            <Text className="text-sm font-semibold text-vinyl-paper">Буцах</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-vinyl-canvas" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Буцах"
            hitSlop={10}
            className="h-10 w-10 items-center justify-center"
          >
            <ArrowLeft size={22} color="#0A0A0A" />
          </Pressable>
          <Text className="text-base font-semibold text-vinyl-black">
            Бүтээгдэхүүн нэмэх
          </Text>
          <View className="h-10 w-10" />
        </View>

        <ScrollView
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <Text className="mb-2 text-xs font-semibold tracking-wide text-vinyl-muted">
            ЗУРАГ
          </Text>
          <Text className="mb-3 text-xs text-vinyl-muted">
            Олон зураг нэмж болно. Гол зураг болгохын тулд зураг дээр дарна уу.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-5"
            contentContainerStyle={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 4,
            }}
          >
            {images.map((slot, index) => {
              const uri = slotDisplayUri(slot);
              const isMain = index === mainImageIndex && images.length > 0;
              return (
                <View
                  key={`${index}-${uri}`}
                  className={`relative mr-2.5 overflow-hidden rounded-2xl ${
                    isMain
                      ? 'border-2 border-vinyl-black'
                      : 'border border-vinyl-divider'
                  }`}
                >
                  <Pressable
                    onPress={() => setMainImageIndex(index)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isMain ? 'Гол зураг' : 'Гол зураг болгох'
                    }
                    accessibilityState={{ selected: isMain }}
                  >
                    <Image
                      source={{ uri }}
                      className="h-24 w-24"
                      resizeMode="cover"
                      accessibilityIgnoresInvertColors
                    />
                  </Pressable>
                  {isMain ? (
                    <View
                      pointerEvents="none"
                      className="absolute bottom-1 left-1 rounded bg-vinyl-black px-1.5 py-0.5"
                    >
                      <Text className="text-[10px] font-semibold text-vinyl-paper">
                        Гол
                      </Text>
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => removeImageAt(index)}
                    accessibilityRole="button"
                    accessibilityLabel="Зураг устгах"
                    hitSlop={6}
                    className="absolute right-1 top-1 z-10 h-7 w-7 items-center justify-center rounded-full bg-black/60"
                  >
                    <X size={16} color="#FFFFFF" strokeWidth={2.5} />
                  </Pressable>
                </View>
              );
            })}

            {images.length < MAX_PRODUCT_IMAGES ? (
              <Pressable
                onPress={pickImages}
                accessibilityRole="button"
                accessibilityLabel={
                  images.length === 0 ? 'Зураг оруулах' : 'Зураг нэмэх'
                }
                className="h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-vinyl-muted bg-vinyl-divider/40"
              >
                <ImagePlus size={28} color="#6B6B6B" />
                {images.length === 0 ? (
                  <Text className="mt-1 px-1 text-center text-[10px] font-medium text-vinyl-muted">
                    Сонгох
                  </Text>
                ) : null}
              </Pressable>
            ) : null}
          </ScrollView>

          <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <Text className="text-xs text-vinyl-muted">Нэр</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Жишээ: Dark Side of the Moon"
              placeholderTextColor="#A1A1A1"
              className="mt-2 rounded-xl border border-vinyl-divider px-3 py-3 text-sm text-vinyl-black"
              accessibilityLabel="Нэр"
            />

            <Text className="mt-4 text-xs text-vinyl-muted">Ангилал</Text>
            <Pressable
              onPress={() => setCategoryModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Ангилал сонгох"
              className="mt-2 flex-row items-center justify-between rounded-xl border border-vinyl-divider px-3 py-3"
            >
              <Text
                className={`text-sm ${
                  selectedCategoryName ? 'text-vinyl-black' : 'text-vinyl-muted'
                }`}
              >
                {selectedCategoryName ?? 'Ангилал сонгох'}
              </Text>
              <ChevronDown size={18} color="#6B6B6B" />
            </Pressable>

            {subCategoriesForSelected.length > 0 ? (
              <>
                <Text className="mt-3 text-xs text-vinyl-muted">Дэд ангилал</Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {subCategoriesForSelected.map((sub) => {
                    const active = sub.id === subCategoryId;
                    return (
                      <Pressable
                        key={sub.id}
                        onPress={() => setSubCategoryId(sub.id)}
                        accessibilityRole="button"
                        accessibilityLabel={sub.name}
                        className={`rounded-full px-3 py-1.5 ${
                          active ? 'bg-vinyl-black' : 'bg-vinyl-surface'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            active ? 'text-vinyl-paper' : 'text-vinyl-muted'
                          }`}
                        >
                          {sub.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {selectedSubCategoryName ? (
                  <Text className="mt-1 text-xs text-vinyl-muted">
                    Сонгосон: {selectedSubCategoryName}
                  </Text>
                ) : null}
              </>
            ) : null}

            <Text className="mt-4 text-xs text-vinyl-muted">Тайлбар</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Бүтээгдэхүүний тухай дэлгэрэнгүй..."
              placeholderTextColor="#A1A1A1"
              multiline
              textAlignVertical="top"
              className="mt-2 min-h-[110px] rounded-xl border border-vinyl-divider px-3 py-3 text-sm text-vinyl-black"
              accessibilityLabel="Тайлбар"
            />
          </View>

          <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-vinyl-muted">Үнэ (₮)</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  className="mt-2 rounded-xl border border-vinyl-divider px-3 py-3 text-sm text-vinyl-black"
                  accessibilityLabel="Үнэ"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-vinyl-muted">Хямдралтай үнэ (₮)</Text>
                <TextInput
                  value={discountPrice}
                  onChangeText={setDiscountPrice}
                  keyboardType="numeric"
                  className="mt-2 rounded-xl border border-vinyl-divider px-3 py-3 text-sm text-vinyl-black"
                  accessibilityLabel="Хямдралтай үнэ"
                />
              </View>
            </View>
          </View>

          <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-vinyl-muted">
                  Бэлгийн боодлын үнэ (₮)
                </Text>
                <TextInput
                  value={giftWrapPrice}
                  onChangeText={setGiftWrapPrice}
                  keyboardType="numeric"
                  className="mt-2 rounded-xl border border-vinyl-divider px-3 py-3 text-sm text-vinyl-black"
                  accessibilityLabel="Бэлгийн боодлын үнэ"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-vinyl-muted">Хямдралтай үнэ (₮)</Text>
                <TextInput
                  value={giftWrapDiscountPrice}
                  onChangeText={setGiftWrapDiscountPrice}
                  keyboardType="numeric"
                  className="mt-2 rounded-xl border border-vinyl-divider px-3 py-3 text-sm text-vinyl-black"
                  accessibilityLabel="Бэлгийн боодлын хямдралтай үнэ"
                />
              </View>
            </View>
          </View>

          <AdminProductOptionsEditor
            enabled={optionsEnabled}
            onEnabledChange={setOptionsEnabled}
            label={optionsLabel}
            onLabelChange={setOptionsLabel}
            drafts={optionDrafts}
            onDraftsChange={setOptionDrafts}
            imageSlots={images}
            slotUri={slotDisplayUri}
          />

          <View className="mb-4 flex-row items-center justify-between overflow-hidden rounded-2xl bg-white px-4 py-4">
            <View className="min-w-0 flex-1 flex-row items-center pr-3">
              <Package size={18} color="#0A0A0A" />
              <Text className="ml-3 shrink text-sm text-vinyl-black">
                Боломжтой
              </Text>
            </View>
            <View className="shrink-0">
              <Switch
                value={available}
                onValueChange={setAvailable}
                accessibilityLabel="Боломжтой"
              />
            </View>
          </View>

          <View className="mb-4 flex-row items-center justify-between overflow-hidden rounded-2xl bg-white px-4 py-4">
            <View className="min-w-0 flex-1 flex-row items-center pr-3">
              <Star size={18} color="#0A0A0A" />
              <Text className="ml-3 shrink text-sm text-vinyl-black">
                Онцлох
              </Text>
            </View>
            <View className="shrink-0">
              <Switch
                value={isFeatured}
                onValueChange={setIsFeatured}
                accessibilityLabel="Онцлох"
              />
            </View>
          </View>

          <View className="mb-6 flex-row items-center justify-between overflow-hidden rounded-2xl bg-white px-4 py-4">
            <View className="min-w-0 flex-1 flex-row items-center pr-3">
              <Printer size={18} color="#0A0A0A" />
              <Text className="ml-3 shrink text-sm text-vinyl-black">
                Лазер хэвлэл идэвхжүүлэх
              </Text>
            </View>
            <View className="shrink-0">
              <Switch
                value={laserEnabled}
                onValueChange={setLaserEnabled}
                accessibilityLabel="Лазер хэвлэл идэвхжүүлэх"
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Цуцлах"
              disabled={busy}
              className="h-14 flex-1 items-center justify-center rounded-2xl border border-vinyl-black bg-white"
            >
              <Text className="text-base font-semibold text-vinyl-black">
                Цуцлах
              </Text>
            </Pressable>

            <Pressable
              onPress={onSave}
              accessibilityRole="button"
              accessibilityLabel="Хадгалах"
              disabled={busy}
              className="h-14 flex-1 items-center justify-center rounded-2xl bg-vinyl-black"
            >
              {busy && !deleteMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-semibold text-vinyl-paper">
                  Хадгалах
                </Text>
              )}
            </Pressable>
          </View>

          {isEdit ? (
            <Pressable
              onPress={onDeleteProduct}
              accessibilityRole="button"
              accessibilityLabel="Бүтээгдэхүүн устгах"
              disabled={busy}
              className="mt-4 h-14 items-center justify-center rounded-2xl border border-vinyl-sale bg-white"
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator color="#8B1A1A" />
              ) : (
                <Text className="text-base font-semibold text-vinyl-sale">
                  Бүтээгдэхүүн устгах
                </Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>

        <Modal
          visible={categoryModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCategoryModalOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/30">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Хаах"
              onPress={() => setCategoryModalOpen(false)}
              className="absolute inset-0"
            />
            <View className="max-h-[60%] rounded-t-3xl bg-white px-4 pb-8 pt-3">
              <Text className="mb-3 text-center text-base font-semibold text-vinyl-black">
                Ангилал сонгох
              </Text>
              {categoriesQuery.isPending ? (
                <View className="py-10">
                  <ActivityIndicator />
                </View>
              ) : categoriesQuery.isError ? (
                <Text className="py-6 text-center text-sm text-vinyl-muted">
                  Ангилал ачаалж чадсангүй
                </Text>
              ) : (
                <ScrollView>
                  {(categoriesQuery.data ?? []).map((c: CategoryRow) => (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setCategoryId(c.id);
                        setSubCategoryId(null);
                        setCategoryModalOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={c.name}
                      className="border-b border-vinyl-divider py-4"
                    >
                      <Text className="text-base text-vinyl-black">{c.name}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => {
                      setCategoryId(null);
                      setSubCategoryId(null);
                      setCategoryModalOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Ангилалгүй"
                    className="py-4"
                  >
                    <Text className="text-base text-vinyl-muted">Ангилалгүй</Text>
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
