"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { calculateCartLineTotal, getBoxVariantLabel, MAX_CART_LINE_QUANTITY } from "@/lib/commerce";
import type { CartLineItem } from "@/types/commerce";

interface CartContextValue {
  isReady: boolean;
  items: CartLineItem[];
  selectedItems: CartLineItem[];
  selectedItemIds: string[];
  itemCount: number;
  subtotal: number;
  selectedSubtotal: number;
  addItem: (item: Omit<CartLineItem, "id">) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  setItemSelected: (id: string, selected: boolean) => void;
  setAllItemsSelected: (selected: boolean) => void;
  removeCheckedOutItems: () => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const STORAGE_KEY = "tsokolitaw-cart-v3";
const SELECTION_STORAGE_KEY = "tsokolitaw-cart-selection-v2";
const LEGACY_PENDING_CHECKOUT_STORAGE_KEY = "tsokolitaw-pending-checkout-items-v1";
const LEGACY_CART_STORAGE_KEYS = ["tsokolitaw-cart-v2", "tsokolitaw-cart-selection-v1"];
type StoredCartLine = Partial<CartLineItem> & {
  extraSauceAddonId?: string | null;
  extraSauceQuantity?: number;
  extraSaucePrice?: number;
};

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_CART_LINE_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      LEGACY_CART_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as unknown) : [];
      let restored = Array.isArray(parsed)
        ? (parsed as StoredCartLine[]).map(
            (item) =>
              ({
                ...item,
                addonId: item.addonId ?? item.extraSauceAddonId ?? null,
                addonName:
                  item.addonName ??
                  ((item.extraSauceQuantity ?? 0) > 0 ? "Extra sea salt cream" : null),
                addonQuantity: item.addonQuantity ?? item.extraSauceQuantity ?? 0,
                addonPrice: item.addonPrice ?? item.extraSaucePrice ?? 0,
                coatingPrices: item.coatingPrices ?? {},
                variantLabel: item.variantLabel ?? getBoxVariantLabel(item.pieceCount ?? 0),
                quantity: normalizeQuantity(item.quantity ?? 1),
              }) as CartLineItem,
          )
        : [];
      const checkedOutIds = new Set<string>();
      const legacyPrefix = `${LEGACY_PENDING_CHECKOUT_STORAGE_KEY}:`;
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (!key?.startsWith(legacyPrefix)) continue;
        try {
          const value = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
          if (Array.isArray(value)) {
            value.forEach((id) => {
              if (typeof id === "string") checkedOutIds.add(id);
            });
          }
        } catch {
          // The legacy entry is removed below even when it cannot be parsed.
        }
        window.localStorage.removeItem(key);
      }
      window.localStorage.removeItem(LEGACY_PENDING_CHECKOUT_STORAGE_KEY);
      restored = restored.filter((item) => !checkedOutIds.has(item.id));

      const storedSelection = window.localStorage.getItem(SELECTION_STORAGE_KEY);
      const parsedSelection = storedSelection ? (JSON.parse(storedSelection) as unknown) : null;
      const restoredIds = new Set(restored.map((item) => item.id));
      const selectedIds = Array.isArray(parsedSelection)
        ? parsedSelection.filter(
            (id): id is string => typeof id === "string" && restoredIds.has(id),
          )
        : restored.map((item) => item.id);
      queueMicrotask(() => {
        if (active) {
          setItems(restored);
          setSelectedItemIds(selectedIds);
          setReady(true);
        }
      });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SELECTION_STORAGE_KEY);
      queueMicrotask(() => {
        if (active) setReady(true);
      });
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selectedItemIds));
    }
  }, [items, ready, selectedItemIds]);

  const selectedItems = items.filter((item) => selectedItemIds.includes(item.id));
  const value = useMemo<CartContextValue>(
    () => ({
      isReady: ready,
      items,
      selectedItems,
      selectedItemIds,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + calculateCartLineTotal(item), 0),
      selectedSubtotal: selectedItems.reduce((sum, item) => sum + calculateCartLineTotal(item), 0),
      addItem: (item) => {
        const id = crypto.randomUUID();
        setItems((current) => [
          ...current,
          { ...item, id, quantity: normalizeQuantity(item.quantity) },
        ]);
        setSelectedItemIds((current) => [...current, id]);
      },
      updateQuantity: (id, quantity) =>
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, quantity: normalizeQuantity(quantity) } : item,
          ),
        ),
      removeItem: (id) => {
        setItems((current) => current.filter((item) => item.id !== id));
        setSelectedItemIds((current) => current.filter((itemId) => itemId !== id));
      },
      setItemSelected: (id, selected) =>
        setSelectedItemIds((current) =>
          selected
            ? current.includes(id)
              ? current
              : [...current, id]
            : current.filter((itemId) => itemId !== id),
        ),
      setAllItemsSelected: (selected) =>
        setSelectedItemIds(selected ? items.map((item) => item.id) : []),
      removeCheckedOutItems: () => {
        const checkedOutIds = new Set(selectedItems.map((item) => item.id));
        setItems((current) => current.filter((item) => !checkedOutIds.has(item.id)));
        setSelectedItemIds((current) => current.filter((id) => !checkedOutIds.has(id)));
      },
      clearCart: () => {
        setItems([]);
        setSelectedItemIds([]);
      },
    }),
    [items, ready, selectedItemIds, selectedItems],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  // Streamed consumers can hydrate after the provider restores localStorage.
  // Their first render must still match the empty server cart.
  if (!hydrated)
    return {
      ...context,
      isReady: false,
      items: [],
      selectedItems: [],
      selectedItemIds: [],
      itemCount: 0,
      subtotal: 0,
      selectedSubtotal: 0,
    };
  return context;
}
