"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import type { CartLineItem } from "@/types/commerce";

export function ReorderButton({ items }: { items: Array<Omit<CartLineItem, "id">> }) {
  const router = useRouter();
  const { addItem } = useCart();

  return (
    <button
      type="button"
      onClick={() => {
        items.forEach((item) => addItem(item));
        router.push("/cart");
      }}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-surface"
    >
      <RotateCcw aria-hidden="true" size={17} />
      Order again
    </button>
  );
}
