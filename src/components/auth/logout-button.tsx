"use client";

import { LogOut, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { signOutAction } from "@/app/auth/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";

interface LogoutButtonProps {
  className: string;
  iconSize?: number;
  menuItem?: boolean;
  hideLabel?: boolean;
}

export function LogoutButton({
  className,
  iconSize = 16,
  menuItem = false,
  hideLabel = false,
}: LogoutButtonProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
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
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        role={menuItem ? "menuitem" : undefined}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={className}
        onClick={() => setOpen(true)}
      >
        <LogOut aria-hidden="true" size={iconSize} />
        <span className={hideLabel ? "sr-only" : undefined}>Log out</span>
      </button>

      {open ? createPortal(
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/40 p-4"
          onPointerDown={() => setOpen(false)}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onPointerDown={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="font-display text-2xl text-foreground">
                  Log out of TsokoLitaw?
                </h2>
                <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted-foreground">
                  You will be signed out of this browser and returned to the home page.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close logout confirmation"
                onClick={() => setOpen(false)}
                className="flex size-11 shrink-0 items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <form action={signOutAction} className="mt-7 grid gap-3 sm:grid-cols-2">
              <SecondaryButton className="w-full" type="button" autoFocus onClick={() => setOpen(false)}>
                Stay signed in
              </SecondaryButton>
              <ConfirmLogoutButton />
            </form>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

function ConfirmLogoutButton() {
  const { pending } = useFormStatus();

  return (
    <PrimaryButton className="w-full" type="submit" disabled={pending}>
      <LogOut aria-hidden="true" size={17} />
      {pending ? "Logging out…" : "Log out"}
    </PrimaryButton>
  );
}
