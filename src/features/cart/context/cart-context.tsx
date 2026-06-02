import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { ProductWithCategory } from '../../products/api/use-product-query';
import {
  buildCartLineItem,
  rebuildCartLineItem,
  type BuildCartLineParams,
} from '../lib/build-cart-line';
import { loadCartFromStorage, saveCartToStorage } from '../lib/cart-storage';
import { debugLog } from '../../../lib/debug-log';
import type { PendingHomeTab } from '../../home/lib/navigate-to-home-tab';
import type {
  CartGiftSelection,
  CartLaserSelection,
  CartLineItem,
  CartProductOptionSelection,
} from '../types/cart-line-item';

type AddToCartParams = {
  product: ProductWithCategory;
  gift?: CartGiftSelection | null;
  productOption?: CartProductOptionSelection | null;
  laser?: CartLaserSelection | null;
};

type CartContextValue = {
  lines: CartLineItem[];
  itemCount: number;
  hydrated: boolean;
  pendingHomeTab: PendingHomeTab | null;
  setPendingHomeTab: (tab: PendingHomeTab | null) => void;
  addItem: (params: AddToCartParams) => void;
  updateLine: (lineId: string, params: AddToCartParams) => void;
  removeLine: (lineId: string) => void;
  setLineQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLineItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [pendingHomeTab, setPendingHomeTab] = useState<PendingHomeTab | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void loadCartFromStorage().then((stored) => {
      if (!cancelled) {
        setLines(stored);
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveCartToStorage(lines).catch((err) => {
      // #region agent log
      void debugLog(
        'cart-context.tsx:saveCart',
        'saveCartToStorage failed',
        {
          lineCount: lines.length,
          error: err instanceof Error ? err.message : String(err),
        },
        'H-D',
      );
      // #endregion
    });
  }, [lines, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    // #region agent log
    void debugLog(
      'cart-context.tsx:lines',
      'cart lines changed',
      {
        lineCount: lines.length,
        firstLineId: lines[0]?.lineId ?? null,
        firstUnitPrice: lines[0]?.unitPrice ?? null,
      },
      'H-C',
    );
    // #endregion
  }, [lines, hydrated]);

  const addItem = useCallback((params: AddToCartParams) => {
    // #region agent log
    void debugLog(
      'cart-context.tsx:addItem',
      'addItem called',
      { productId: params.product.id, title: params.product.title },
      'H-C',
    );
    // #endregion
    const gift = params.gift ?? null;
    const productOption = params.productOption ?? null;
    const laser = params.laser ?? null;
    const isSimpleAdd =
      gift == null && laser == null && productOption == null;

    setLines((prev) => {
      if (isSimpleAdd) {
        const existing = prev.find(
          (l) =>
            l.productId === params.product.id &&
            l.giftOptionId == null &&
            l.productOptionId == null &&
            !l.laserEnabled,
        );
        if (existing) {
          return prev.map((l) =>
            l.lineId === existing.lineId
              ? { ...l, quantity: Math.min(99, l.quantity + 1) }
              : l,
          );
        }
      }
      const optionId = productOption?.optionId ?? null;
      const existingWithOption = prev.find(
        (l) =>
          l.productId === params.product.id &&
          l.giftOptionId === (gift?.optionId ?? null) &&
          l.productOptionId === optionId &&
          l.laserEnabled === (laser != null) &&
          (laser == null || l.laserImageUri === laser.imageUri),
      );
      if (existingWithOption) {
        return prev.map((l) =>
          l.lineId === existingWithOption.lineId
            ? { ...l, quantity: Math.min(99, l.quantity + 1) }
            : l,
        );
      }
      return [...prev, buildCartLineItem(params)];
    });
  }, []);

  const updateLine = useCallback((lineId: string, params: BuildCartLineParams) => {
    setLines((prev) =>
      prev.map((l) =>
        l.lineId === lineId ? rebuildCartLineItem(l, params) : l,
      ),
    );
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const setLineQuantity = useCallback((lineId: string, quantity: number) => {
    const next = Math.max(1, Math.min(99, Math.round(quantity)));
    setLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, quantity: next } : l)),
    );
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
  }, []);

  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      hydrated,
      pendingHomeTab,
      setPendingHomeTab,
      addItem,
      updateLine,
      removeLine,
      setLineQuantity,
      clearCart,
    }),
    [
      lines,
      itemCount,
      hydrated,
      pendingHomeTab,
      addItem,
      updateLine,
      removeLine,
      setLineQuantity,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
