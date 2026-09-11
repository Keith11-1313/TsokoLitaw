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

export function ReleasePendingCart({ orderId }: { orderId: string }) {
  const { isReady, releasePendingCheckoutItems } = useCart();
  const releasedOrder = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || releasedOrder.current === orderId) return;
    releasedOrder.current = orderId;
    releasePendingCheckoutItems(orderId);
  }, [isReady, orderId, releasePendingCheckoutItems]);

  return null;
}
