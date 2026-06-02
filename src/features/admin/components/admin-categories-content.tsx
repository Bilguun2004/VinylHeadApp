import {
  ChevronDown,
  ChevronUp,
  Disc3,
  GripVertical,
  ListMusic,
  Mic2,
  Plus,
  Radio,
  Speaker,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import { useCreateCategoryMutation } from '../api/use-create-category-mutation';
import { useCreateSubCategoryMutation } from '../api/use-create-sub-category-mutation';
import { useDeleteCategoryMutation } from '../api/use-delete-category-mutation';
import { useDeleteSubCategoryMutation } from '../api/use-delete-sub-category-mutation';
import { useUpdateCategoryMutation } from '../api/use-update-category-mutation';
import { useReorderCategoriesMutation } from '../api/use-reorder-categories-mutation';
import { useUpdateSubCategoryMutation } from '../api/use-update-sub-category-mutation';
import {
  useAdminCategoryTreeQuery,
  type AdminCategoryWithSubs,
  type SubCategoryRow,
} from '../api/use-admin-sub-categories-query';

function categoryIconForName(name: string) {
  const n = name.toLowerCase();
  if (n.includes('пянз') && !n.includes('тоглуулагч')) return Disc3;
  if (n.includes('тоглуулагч') || n.includes('player')) return Radio;
  if (n.includes('өсгөгч') || n.includes('amplifier') || n.includes('speaker'))
    return Speaker;
  if (n.includes('pop')) return Mic2;
  return ListMusic;
}

type NameModalProps = {
  visible: boolean;
  title: string;
  initialName: string;
  confirmLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
};

function NameModal({
  visible,
  title,
  initialName,
  confirmLabel,
  busy,
  onClose,
  onConfirm,
}: NameModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (visible) setValue(initialName);
  }, [visible, initialName]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center bg-black/40 px-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Хаах"
          onPress={onClose}
          className="absolute inset-0"
        />
        <View className="rounded-2xl bg-white px-5 py-5" accessibilityViewIsModal>
          <Text className="text-center text-base font-semibold text-vinyl-black">
            {title}
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Нэр"
            placeholderTextColor="#A1A1A1"
            autoFocus
            editable={!busy}
            className="mt-4 rounded-xl border border-vinyl-divider px-3 py-3 text-sm text-vinyl-black"
          />
          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={onClose}
              disabled={busy}
              className="h-12 flex-1 items-center justify-center rounded-xl border border-vinyl-black bg-white"
            >
              <Text className="text-sm font-semibold text-vinyl-black">Цуцлах</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(value)}
              disabled={busy}
              className="h-12 flex-1 items-center justify-center rounded-xl bg-vinyl-black"
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-semibold text-vinyl-paper">
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type CategoryAccordionCardProps = {
  category: AdminCategoryWithSubs;
  expanded: boolean;
  isDragging?: boolean;
  onToggle: () => void;
  onDragActivate?: () => void;
  onCategoryMenu: (category: AdminCategoryWithSubs) => void;
  onSubMenu: (sub: SubCategoryRow, category: AdminCategoryWithSubs) => void;
  onAddSub: (category: AdminCategoryWithSubs) => void;
};

function CategoryAccordionCard({
  category,
  expanded,
  isDragging = false,
  onToggle,
  onDragActivate,
  onCategoryMenu,
  onSubMenu,
  onAddSub,
}: CategoryAccordionCardProps) {
  const Icon = categoryIconForName(category.name);
  const subCount = category.sub_categories.length;
  const subLabel =
    subCount === 0
      ? 'Дэд ангилал байхгүй'
      : `${subCount} дэд ангилал`;

  return (
    <View
      className={`mb-3 overflow-hidden rounded-2xl bg-white shadow-sm ${
        isDragging ? 'opacity-90 shadow-md' : ''
      }`}
    >
      <View className="flex-row items-center px-2 py-4">
        <Pressable
          onLongPress={onDragActivate}
          delayLongPress={150}
          disabled={!onDragActivate}
          accessibilityRole="button"
          accessibilityLabel={`${category.name} зөөх`}
          hitSlop={8}
          className="h-12 w-10 items-center justify-center"
        >
          <GripVertical size={20} color="#A1A1A1" />
        </Pressable>
        <Pressable
          onPress={onToggle}
          onLongPress={() => onCategoryMenu(category)}
          accessibilityRole="button"
          accessibilityLabel={`${category.name}, ${subLabel}`}
          className="min-w-0 flex-1 flex-row items-center pr-2"
        >
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-vinyl-surface">
          <Icon size={22} color="#0A0A0A" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-serif text-lg font-semibold text-vinyl-black">
            {category.name}
          </Text>
          <Text className="mt-0.5 text-xs text-vinyl-muted">{subLabel}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={22} color="#6B6B6B" />
        ) : (
          <ChevronDown size={22} color="#6B6B6B" />
        )}
        </Pressable>
      </View>

      {expanded ? (
        <View className="border-t border-vinyl-divider px-4 pb-4 pt-2">
          {category.sub_categories.map((sub) => (
            <Pressable
              key={sub.id}
              onLongPress={() => onSubMenu(sub, category)}
              accessibilityRole="button"
              accessibilityLabel={sub.name}
              className="border-b border-vinyl-divider/60 py-3 last:border-b-0"
            >
              <Text className="text-base text-vinyl-black">{sub.name}</Text>
            </Pressable>
          ))}

          <Pressable
            onPress={() => onAddSub(category)}
            accessibilityRole="button"
            accessibilityLabel="Дэд ангилал нэмэх"
            className="mt-2 flex-row items-center justify-center py-3"
          >
            <Plus size={14} color="#6B6B6B" />
            <Text className="ml-1.5 text-xs font-semibold tracking-wide text-vinyl-muted">
              ДЭД АНГИЛАЛ НЭМЭХ
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function AdminCategoriesContent() {
  const treeQuery = useAdminCategoryTreeQuery();
  const reorderMutation = useReorderCategoriesMutation();
  const createCategoryMutation = useCreateCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const createSubMutation = useCreateSubCategoryMutation();
  const updateSubMutation = useUpdateSubCategoryMutation();
  const deleteSubMutation = useDeleteSubCategoryMutation();

  const [orderedCategories, setOrderedCategories] = useState<AdminCategoryWithSubs[]>(
    [],
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const didAutoExpandRef = useRef(false);
  const isDraggingRef = useRef(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [renameCategory, setRenameCategory] = useState<AdminCategoryWithSubs | null>(
    null,
  );
  const [addSubForCategory, setAddSubForCategory] =
    useState<AdminCategoryWithSubs | null>(null);
  const [renameSub, setRenameSub] = useState<SubCategoryRow | null>(null);

  const categories = treeQuery.data ?? [];

  useEffect(() => {
    if (isDraggingRef.current || reorderMutation.isPending) return;
    setOrderedCategories(categories);
  }, [categories, reorderMutation.isPending]);

  useEffect(() => {
    if (didAutoExpandRef.current || categories.length === 0) return;
    didAutoExpandRef.current = true;
    setExpandedIds(new Set([categories[0].id]));
  }, [categories]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onCategoryMenu = (category: AdminCategoryWithSubs) => {
    Alert.alert(category.name, undefined, [
      { text: 'Нэр засах', onPress: () => setRenameCategory(category) },
      {
        text: 'Устах',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Устгах уу?',
            'Дэд ангиллууд хамт устгагдана. Бүтээгдэхүүний ангилал хоосон болно.',
            [
              { text: 'Цуцлах', style: 'cancel' },
              {
                text: 'Устгах',
                style: 'destructive',
                onPress: () => deleteCategoryMutation.mutate(category.id),
              },
            ],
          );
        },
      },
      { text: 'Хаах', style: 'cancel' },
    ]);
  };

  const onSubMenu = (sub: SubCategoryRow, category: AdminCategoryWithSubs) => {
    Alert.alert(sub.name, category.name, [
      { text: 'Нэр засах', onPress: () => setRenameSub(sub) },
      {
        text: 'Устах',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Устгах уу?', 'Энэ дэд ангиллыг устгах болно.', [
            { text: 'Цуцлах', style: 'cancel' },
            {
              text: 'Устгах',
              style: 'destructive',
              onPress: () => deleteSubMutation.mutate(sub.id),
            },
          ]);
        },
      },
      { text: 'Хаах', style: 'cancel' },
    ]);
  };

  const handleDragEnd = useCallback(
    ({ data }: { data: AdminCategoryWithSubs[] }) => {
      isDraggingRef.current = false;
      const prevIds = orderedCategories.map((c) => c.id).join(',');
      const newIds = data.map((c) => c.id).join(',');
      setOrderedCategories(data);
      if (prevIds === newIds) return;

      reorderMutation.mutate(
        data.map((c) => c.id),
        {
          onError: (e) => {
            Alert.alert(
              'Алдаа',
              e instanceof Error ? e.message : 'Дарааллыг хадгалж чадсангүй',
            );
            setOrderedCategories(categories);
          },
        },
      );
    },
    [orderedCategories, categories, reorderMutation],
  );

  const renderCategoryItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<AdminCategoryWithSubs>) => (
      <ScaleDecorator>
        <CategoryAccordionCard
          category={item}
          expanded={expandedIds.has(item.id)}
          isDragging={isActive}
          onToggle={() => toggleExpanded(item.id)}
          onDragActivate={drag}
          onCategoryMenu={onCategoryMenu}
          onSubMenu={onSubMenu}
          onAddSub={setAddSubForCategory}
        />
      </ScaleDecorator>
    ),
    [expandedIds],
  );

  const busy =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    createSubMutation.isPending ||
    updateSubMutation.isPending;

  return (
    <View className="flex-1 bg-vinyl-canvas">
      <View className="px-5 pt-2">
        <Text className="font-serif text-3xl text-vinyl-black">
          Ангилал удирдлага
        </Text>
        <Text className="mt-1 text-sm text-vinyl-muted">
          Бүтээгдэхүүний ангилал болон дэд ангиллуудыг засах
        </Text>
        <Text className="mt-2 text-xs text-vinyl-muted">
          Дээрх ангиллууд захиалгад харагдана. Бариад чирж дарааллыг өөрчилнө үү.
        </Text>
      </View>

      {treeQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : treeQuery.isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-semibold text-vinyl-black">
            Ачаалж чадсангүй
          </Text>
        </View>
      ) : (
        <DraggableFlatList
          data={orderedCategories}
          keyExtractor={(item) => item.id}
          onDragBegin={() => {
            isDraggingRef.current = true;
          }}
          onDragEnd={handleDragEnd}
          activationDistance={10}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="pt-8 text-center text-sm text-vinyl-muted">
              Ангилал олдсонгүй. + товчоор нэмнэ үү.
            </Text>
          }
          renderItem={renderCategoryItem}
        />
      )}

      <Pressable
        onPress={() => setAddCategoryOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Ангилал нэмэх"
        className="absolute bottom-28 right-5 h-14 w-14 items-center justify-center rounded-full bg-vinyl-black shadow-lg"
      >
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>

      <NameModal
        visible={addCategoryOpen}
        title="Шинэ ангилал"
        initialName=""
        confirmLabel="Нэмэх"
        busy={createCategoryMutation.isPending}
        onClose={() => {
          if (!createCategoryMutation.isPending) setAddCategoryOpen(false);
        }}
        onConfirm={(name) => {
          createCategoryMutation.mutate(name, {
            onSuccess: () => setAddCategoryOpen(false),
            onError: (e) =>
              Alert.alert('Алдаа', e instanceof Error ? e.message : 'Алдаа'),
          });
        }}
      />

      <NameModal
        visible={renameCategory != null}
        title="Ангилалын нэр засах"
        initialName={renameCategory?.name ?? ''}
        confirmLabel="Хадгалах"
        busy={updateCategoryMutation.isPending}
        onClose={() => {
          if (!updateCategoryMutation.isPending) setRenameCategory(null);
        }}
        onConfirm={(name) => {
          if (!renameCategory) return;
          updateCategoryMutation.mutate(
            { id: renameCategory.id, name },
            {
              onSuccess: () => setRenameCategory(null),
              onError: (e) =>
                Alert.alert('Алдаа', e instanceof Error ? e.message : 'Алдаа'),
            },
          );
        }}
      />

      <NameModal
        visible={addSubForCategory != null}
        title={
          addSubForCategory
            ? `Дэд ангилал — ${addSubForCategory.name}`
            : 'Дэд ангилал'
        }
        initialName=""
        confirmLabel="Нэмэх"
        busy={createSubMutation.isPending}
        onClose={() => {
          if (!createSubMutation.isPending) setAddSubForCategory(null);
        }}
        onConfirm={(name) => {
          if (!addSubForCategory) return;
          createSubMutation.mutate(
            { categoryId: addSubForCategory.id, name },
            {
              onSuccess: () => {
                setExpandedIds((prev) => new Set(prev).add(addSubForCategory.id));
                setAddSubForCategory(null);
              },
              onError: (e) =>
                Alert.alert('Алдаа', e instanceof Error ? e.message : 'Алдаа'),
            },
          );
        }}
      />

      <NameModal
        visible={renameSub != null}
        title="Дэд ангиллын нэр засах"
        initialName={renameSub?.name ?? ''}
        confirmLabel="Хадгалах"
        busy={updateSubMutation.isPending}
        onClose={() => {
          if (!updateSubMutation.isPending) setRenameSub(null);
        }}
        onConfirm={(name) => {
          if (!renameSub) return;
          updateSubMutation.mutate(
            { id: renameSub.id, name },
            {
              onSuccess: () => setRenameSub(null),
              onError: (e) =>
                Alert.alert('Алдаа', e instanceof Error ? e.message : 'Алдаа'),
            },
          );
        }}
      />
    </View>
  );
}
