"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  markSelectedItemsPendingCheckout: () => void;
  removePaidCheckoutItems: () => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "tsokolitaw-cart-v2";
const SELECTION_STORAGE_KEY = "tsokolitaw-cart-selection-v1";
const PENDING_CHECKOUT_STORAGE_KEY = "tsokolitaw-pending-checkout-items-v1";
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
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) as unknown : [];
      const restored = Array.isArray(parsed)
        ? (parsed as StoredCartLine[]).map((item) => ({
          ...item,
          addonId: item.addonId ?? item.extraSauceAddonId ?? null,
          addonName: item.addonName ?? ((item.extraSauceQuantity ?? 0) > 0 ? "Extra sea salt cream" : null),
          addonQuantity: item.addonQuantity ?? item.extraSauceQuantity ?? 0,
          addonPrice: item.addonPrice ?? item.extraSaucePrice ?? 0,
          coatingPrices: item.coatingPrices ?? {},
          variantLabel: item.variantLabel ?? getBoxVariantLabel(item.pieceCount ?? 0),
          quantity: normalizeQuantity(item.quantity ?? 1),
        } as CartLineItem))
        : [];
      const storedSelection = window.localStorage.getItem(SELECTION_STORAGE_KEY);
      const parsedSelection = storedSelection ? JSON.parse(storedSelection) as unknown : null;
      const restoredIds = new Set(restored.map((item) => item.id));
      const selectedIds = Array.isArray(parsedSelection)
        ? parsedSelection.filter((id): id is string => typeof id === "string" && restoredIds.has(id))
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
      queueMicrotask(() => { if (active) setReady(true); });
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selectedItemIds));
    }
  }, [items, ready, selectedItemIds]);

  const selectedItems = items.filter((item) => selectedItemIds.includes(item.id));

  const value = useMemo<CartContextValue>(() => ({
    isReady: ready,
    items,
    selectedItems,
    selectedItemIds,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + calculateCartLineTotal(item), 0),
    selectedSubtotal: selectedItems.reduce((sum, item) => sum + calculateCartLineTotal(item), 0),
    addItem: (item) => {
      const id = crypto.randomUUID();
      setItems((current) => [...current, { ...item, id, quantity: normalizeQuantity(item.quantity) }]);
      setSelectedItemIds((current) => [...current, id]);
    },
    updateQuantity: (id, quantity) => setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: normalizeQuantity(quantity) } : item)),
    removeItem: (id) => {
      setItems((current) => current.filter((item) => item.id !== id));
      setSelectedItemIds((current) => current.filter((itemId) => itemId !== id));
    },
    setItemSelected: (id, selected) => setSelectedItemIds((current) => selected
      ? current.includes(id) ? current : [...current, id]
      : current.filter((itemId) => itemId !== id)),
    setAllItemsSelected: (selected) => setSelectedItemIds(selected ? items.map((item) => item.id) : []),
    markSelectedItemsPendingCheckout: () => window.localStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(selectedItems.map((item) => item.id))),
    removePaidCheckoutItems: () => {
      let paidIds = new Set<string>();
      try {
        const storedIds = window.localStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
        const parsedIds = storedIds ? JSON.parse(storedIds) as unknown : [];
        paidIds = new Set(Array.isArray(parsedIds) ? parsedIds.filter((id): id is string => typeof id === "string") : []);
      } catch {
        window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      }
      if (paidIds.size) {
        setItems((current) => current.filter((item) => !paidIds.has(item.id)));
        setSelectedItemIds((current) => current.filter((id) => !paidIds.has(id)));
      }
      window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    },
    clearCart: () => {
      setItems([]);
      setSelectedItemIds([]);
      window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    },
  }), [items, ready, selectedItemIds, selectedItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
