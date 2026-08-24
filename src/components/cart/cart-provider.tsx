"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { calculateItemUnitTotal } from "@/lib/commerce";
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
const STORAGE_KEY = "tsokolitaw-ui-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const restored = stored ? JSON.parse(stored) as CartLineItem[] : [];
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
    subtotal: items.reduce((sum, item) => sum + calculateItemUnitTotal(item.boxPrice, item.extraCoatingCharge, item.extraSauceQuantity) * item.quantity, 0),
    addItem: (item) => setItems((current) => [...current, { ...item, id: crypto.randomUUID() }]),
    updateQuantity: (id, quantity) => setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item)),
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
