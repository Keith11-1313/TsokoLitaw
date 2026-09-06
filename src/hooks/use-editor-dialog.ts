"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useEditorDialog({
  isDirty,
  pending,
  onClose,
}: {
  isDirty: boolean;
  pending: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const discardDialogRef = useRef<HTMLElement>(null);
  const discardWasOpen = useRef(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestClose = useCallback(() => {
    if (pending) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }, [isDirty, onClose, pending]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      const preferred = dialogRef.current?.querySelector<HTMLElement>("[autofocus]");
      const fallback = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      (preferred ?? fallback)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (confirmDiscard) {
        discardDialogRef.current?.querySelector<HTMLElement>("[autofocus]")?.focus();
      } else if (discardWasOpen.current) {
        dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
      }
      discardWasOpen.current = confirmDiscard;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [confirmDiscard]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeDialog = confirmDiscard ? discardDialogRef.current : dialogRef.current;
      if (!activeDialog) return;

      if (event.key === "Escape") {
        event.preventDefault();
        if (confirmDiscard) setConfirmDiscard(false);
        else requestClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(activeDialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmDiscard, requestClose]);

  return {
    dialogRef,
    discardDialogRef,
    confirmDiscard,
    requestClose,
    keepEditing: () => setConfirmDiscard(false),
    discardChanges: onClose,
  };
}
