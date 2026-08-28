"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { calculateCartLineTotal } from "@/lib/commerce";
import type { CartLineItem } from "@/types/commerce";

interface CartContextValue {
  items: CartLineItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartLineItem, "id">) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "tsokolitaw-cart-v2";
export const MAX_CART_LINE_QUANTITY = 20;

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
          quantity: normalizeQuantity(item.quantity ?? 1),
        } as CartLineItem))
        : [];
      queueMicrotask(() => {
        if (active) {
          setItems(restored);
          setReady(true);
        }
      });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      queueMicrotask(() => { if (active) setReady(true); });
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + calculateCartLineTotal(item), 0),
    addItem: (item) => setItems((current) => [...current, {
      ...item,
      id: crypto.randomUUID(),
      quantity: normalizeQuantity(item.quantity),
    }]),
    updateQuantity: (id, quantity) => setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: normalizeQuantity(quantity) } : item)),
    removeItem: (id) => setItems((current) => current.filter((item) => item.id !== id)),
    clearCart: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
