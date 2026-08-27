"use client";

import { ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef } from "react";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/button";
import { formatPhp } from "@/lib/commerce";

interface AddToCartModalProps {
  variantLabel: string;
  quantity: number;
  total: number;
  onClose: () => void;
}

export function AddToCartModal({
  variantLabel,
  quantity,
  total,
  onClose,
}: AddToCartModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const checkCartRef = useRef<HTMLAnchorElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    checkCartRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/40 p-4"
      onPointerDown={onClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onPointerDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-2xl sm:p-8"
      >
        <div className="flex justify-end">
          <button
            type="button"
            aria-label="Close added-to-cart dialog"
            onClick={onClose}
            className="flex size-11 items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand text-surface shadow-md" aria-hidden="true">
          <ShoppingBag size={28} />
        </span>

        <h2 id={titleId} className="mt-2 font-display text-3xl text-foreground">
          Added to your cart
        </h2>
        <p id={descriptionId} role="status" className="mt-3 text-sm leading-6 text-muted-foreground">
          {quantity} × {variantLabel} was added. Current addition: {formatPhp(total)}.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onClose} className={`${secondaryButtonClassName} w-full`}>
            Continue shopping
          </button>
          <Link ref={checkCartRef} href="/cart" className={`${primaryButtonClassName} w-full`}>
            <ShoppingBag aria-hidden="true" size={17} />
            Check cart
          </Link>
        </div>
      </section>
    </div>,
    document.body,
  );
}
