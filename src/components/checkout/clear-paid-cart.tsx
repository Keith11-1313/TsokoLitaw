"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart/cart-provider";

export function ClearPaidCart({ orderId }: { orderId: string }) {
  const { isReady, removePaidCheckoutItems } = useCart();
  const clearedOrder = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || clearedOrder.current === orderId) return;
    clearedOrder.current = orderId;
    removePaidCheckoutItems(orderId);
  }, [isReady, removePaidCheckoutItems, orderId]);

  return null;
}
