import { Disc3, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { CustomerHomeHeader } from '../components/customer-home-header';
import { ProductCard } from '../../products/components/product-card';
import { useProductSearchQuery } from '../../products/api/use-product-search-query';

type CustomerSearchTabProps = {
  onOpenProduct: (productId: string) => void;
  avatarUrl: string | null;
  cartCount: number;
  onProfilePress: () => void;
  onCartPress: () => void;
};

function SearchEmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-vinyl-surface">
        <Disc3 size={36} color="#6B6B6B" strokeWidth={1.5} />
      </View>
      <Text className="text-center text-xl font-extrabold text-vinyl-black">
        Хайх нэрээ оруулна уу
      </Text>
      <Text className="mt-2 text-center text-sm text-vinyl-muted">
        Та хайж буй пянз эсвэл тоглуулагчийн нэрээ оруулж хайна уу.
      </Text>
    </View>
  );
}

export function CustomerSearchTab({
  onOpenProduct,
  avatarUrl,
  cartCount,
  onProfilePress,
  onCartPress,
}: CustomerSearchTabProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const trimmedDebounced = debouncedSearch.trim();
  const hasQuery = trimmedDebounced.length > 0;

  const searchQuery = useProductSearchQuery(debouncedSearch, {
    enabled: hasQuery,
  });

  const horizontalPadding = 24;
  const gutter = 16;
  const cardWidth = useMemo(() => {
    const contentWidth = screenWidth - horizontalPadding * 2;
    return (contentWidth - gutter) / 2;
  }, [screenWidth]);

  return (
    <View className="flex-1 bg-vinyl-canvas">
      <CustomerHomeHeader
        avatarUrl={avatarUrl}
        cartCount={cartCount}
        onProfilePress={onProfilePress}
        onCartPress={onCartPress}
      />

      <View className="mt-2 px-6 pb-3 pt-2">
        <View className="flex-row items-center rounded-xl bg-[#F2F0EF] px-3.5 py-4">
          <Search size={16} color="#757575" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Пянз, тоглуулагч хайх..."
            placeholderTextColor="#A1A1A1"
            className="ml-2 flex-1 py-0 text-sm leading-5 text-vinyl-black"
            accessibilityLabel="Пянз, тоглуулагч хайх"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
      </View>

      {!hasQuery ? (
        <SearchEmptyState />
      ) : searchQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : searchQuery.isError ? (
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
          data={searchQuery.data ?? []}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{
            paddingHorizontal: horizontalPadding,
            justifyContent: 'space-between',
          }}
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: gutter }} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="px-6 pt-10">
              <Text className="text-center text-sm text-vinyl-muted">
                Бараа олдсонгүй.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              width={cardWidth}
              onPress={onOpenProduct}
              showAvailability
            />
          )}
        />
      )}
    </View>
  );
}
