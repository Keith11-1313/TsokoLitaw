"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart/cart-provider";

export function ClearPaidCart() {
  const { isReady, removePaidCheckoutItems } = useCart();
  const hasCleared = useRef(false);

  useEffect(() => {
    if (!isReady || hasCleared.current) return;
    hasCleared.current = true;
    removePaidCheckoutItems();
  }, [isReady, removePaidCheckoutItems]);

  return null;
}
