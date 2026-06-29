import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { SALE_CATEGORY_ID } from '../../../lib/catalog-seed-ids';
import {
  useHomeNavCategoriesQuery,
  withSaleCategory,
} from '../api/use-categories-query';
import type { ProductWithCategory } from '../api/use-product-query';
import {
  useProductsQuery,
  useSaleProductsQuery,
} from '../api/use-products-query';
import { ALL_SUB_CATEGORY_ID } from '../lib/catalog-constants';
import { partitionFeaturedProducts } from '../lib/partition-featured-products';
import { FeaturedProductCard } from './featured-product-card';
import { ProductCard } from './product-card';

export type CustomerShopCatalogProps = {
  onProductPress: (productId: string) => void;
  onProductLongPress?: (product: ProductWithCategory) => void;
  showAvailability?: boolean;
  enabled?: boolean;
};

export function CustomerShopCatalog({
  onProductPress,
  onProductLongPress,
  showAvailability = true,
  enabled = true,
}: CustomerShopCatalogProps) {
  const { width: screenWidth } = useWindowDimensions();

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSubCategoryId, setActiveSubCategoryId] = useState<string | null>(
    null,
  );

  const navCategoriesQuery = useHomeNavCategoriesQuery({ enabled });
  const saleProductsQuery = useSaleProductsQuery({ enabled });

  const displayCategories = useMemo(() => {
    const dbRows = navCategoriesQuery.data ?? [];
    const includeSale =
      saleProductsQuery.isSuccess && Boolean(saleProductsQuery.data?.showTab);
    return withSaleCategory(dbRows, includeSale);
  }, [
    navCategoriesQuery.data,
    saleProductsQuery.data,
    saleProductsQuery.isSuccess,
  ]);

  const isSaleCategory = activeCategoryId === SALE_CATEGORY_ID;

  const activeCategory = useMemo(
    () => displayCategories.find((c) => c.id === activeCategoryId),
    [displayCategories, activeCategoryId],
  );

  const activeSubCategories = activeCategory?.sub_categories ?? [];

  useEffect(() => {
    const rows = displayCategories;
    if (!rows.length) return;
    setActiveCategoryId((current) => {
      if (current && rows.some((c) => c.id === current)) return current;
      return rows[0].id;
    });
  }, [displayCategories]);

  const subNavItems = useMemo(() => {
    if (activeSubCategories.length === 0) return [];
    return [
      { id: ALL_SUB_CATEGORY_ID, name: 'Бүгд' },
      ...activeSubCategories,
    ];
  }, [activeSubCategories]);

  useEffect(() => {
    if (activeSubCategories.length === 0) {
      setActiveSubCategoryId(null);
      return;
    }
    setActiveSubCategoryId((current) => {
      if (current === ALL_SUB_CATEGORY_ID) return current;
      if (current && activeSubCategories.some((s) => s.id === current)) {
        return current;
      }
      return ALL_SUB_CATEGORY_ID;
    });
  }, [activeCategoryId, activeSubCategories]);

  const filterSubCategoryId =
    activeSubCategoryId === ALL_SUB_CATEGORY_ID ? null : activeSubCategoryId;

  const productsQuery = useProductsQuery(activeCategoryId, filterSubCategoryId, {
    enabled: enabled && activeCategoryId != null && !isSaleCategory,
  });

  const saleGridQuery = useSaleProductsQuery({
    enabled: enabled && isSaleCategory,
  });

  const gridProducts = isSaleCategory
    ? saleGridQuery.data?.products
    : productsQuery.data;
  const gridPending = isSaleCategory
    ? saleGridQuery.isPending
    : productsQuery.isPending;
  const gridError = isSaleCategory ? saleGridQuery.isError : productsQuery.isError;

  const horizontalPadding = 24;
  const gutter = 16;
  const cardWidth = useMemo(() => {
    const contentWidth = screenWidth - horizontalPadding * 2;
    return (contentWidth - gutter) / 2;
  }, [screenWidth]);

  const featuredCardWidth = screenWidth - horizontalPadding * 2;

  const { featured, regular } = useMemo(
    () => partitionFeaturedProducts(gridProducts ?? []),
    [gridProducts],
  );

  const featuredListHeader = useMemo(() => {
    if (featured.length === 0) return null;
    return (
      <View className="pb-4">
        {featured.map((product, index) => (
          <View
            key={product.id}
            style={{
              paddingHorizontal: horizontalPadding,
              marginTop: index === 0 ? 0 : gutter,
            }}
          >
            <FeaturedProductCard
              product={product}
              width={featuredCardWidth}
              onPress={onProductPress}
              showAvailability={showAvailability}
            />
          </View>
        ))}
      </View>
    );
  }, [
    featured,
    featuredCardWidth,
    horizontalPadding,
    gutter,
    onProductPress,
    showAvailability,
  ]);

  if (!enabled) {
    return <View className="flex-1" />;
  }

  if (navCategoriesQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (navCategoriesQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-base font-semibold text-vinyl-black">
          Ангиллуудыг ачаалж чадсангүй
        </Text>
        <Text className="mt-2 text-center text-sm text-vinyl-muted">
          Supabase болон сүлжээний тохиргоогоо шалгана уу.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="px-6">
        <FlatList
          data={displayCategories}
          keyExtractor={(c) => c.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 14 }}
          ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
          renderItem={({ item }) => {
            const isActive = item.id === activeCategoryId;
            return (
              <Pressable
                onPress={() => setActiveCategoryId(item.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={item.name}
                className={`rounded-full px-4 py-2 ${
                  isActive ? 'bg-vinyl-black' : 'bg-vinyl-surface'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isActive ? 'text-vinyl-paper' : 'text-vinyl-muted'
                  }`}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />

        {activeSubCategories.length > 0 ? (
          <>
            <FlatList
              data={subNavItems}
              keyExtractor={(s) => s.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
              renderItem={({ item: sub }) => {
                const isSubActive = sub.id === activeSubCategoryId;
                return (
                  <Pressable
                    onPress={() => setActiveSubCategoryId(sub.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSubActive }}
                    accessibilityLabel={sub.name}
                    className={`rounded-full px-4 py-2 ${
                      isSubActive ? 'bg-vinyl-black' : 'bg-vinyl-surface'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        isSubActive ? 'text-vinyl-paper' : 'text-vinyl-muted'
                      }`}
                    >
                      {sub.name}
                    </Text>
                  </Pressable>
                );
              }}
            />
            {activeSubCategoryId ? (
              <View className="pb-2">
                <Text className="text-2xl font-extrabold text-vinyl-black">
                  {activeSubCategoryId === ALL_SUB_CATEGORY_ID
                    ? activeCategory?.name ?? ''
                    : `${activeSubCategories.find((s) => s.id === activeSubCategoryId)?.name ?? ''} ${activeCategory?.name ?? ''}`}
                </Text>
                <Text className="mt-1 text-sm text-vinyl-muted">
                  {activeSubCategoryId === ALL_SUB_CATEGORY_ID
                    ? `${activeCategory?.name ?? ''} ангиллын бүх бүтээгдэхүүн`
                    : `${activeCategory?.name ?? ''} ангиллын бүтээгдэхүүн`}
                </Text>
              </View>
            ) : null}
          </>
        ) : isSaleCategory ? (
          <View className="pb-2">
            <Text className="text-2xl font-extrabold text-vinyl-black">
              {activeCategory?.name ?? ''}
            </Text>
            <Text className="mt-1 text-sm text-vinyl-muted">
              Хямдралтай бүх бүтээгдэхүүн
            </Text>
          </View>
        ) : null}
      </View>

      {activeCategoryId == null ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-vinyl-muted">
            Ангилал алга байна.
          </Text>
        </View>
      ) : gridPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : gridError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-semibold text-vinyl-black">
            Ачаалж чадсангүй
          </Text>
          <Text className="mt-2 text-center text-sm text-vinyl-muted">
            Сүлжээ болон Supabase тохиргоогоо шалгана уу.
          </Text>
        </View>
      ) : (
        <FlatList
          data={regular}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{
            paddingHorizontal: horizontalPadding,
            justifyContent: 'space-between',
          }}
          contentContainerStyle={{ paddingBottom: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: gutter }} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={featuredListHeader}
          ListEmptyComponent={
            featured.length === 0 ? (
              <View className="px-6 pt-10">
                <Text className="text-center text-sm text-vinyl-muted">
                  Бараа олдсонгүй.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              width={cardWidth}
              onPress={onProductPress}
              onLongPress={onProductLongPress}
              showAvailability={showAvailability}
            />
          )}
        />
      )}
    </View>
  );
}
