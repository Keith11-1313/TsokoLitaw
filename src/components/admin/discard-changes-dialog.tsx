import type { RefObject } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";

export function DiscardChangesDialog({
  dialogRef,
  onKeepEditing,
  onDiscard,
}: {
  dialogRef: RefObject<HTMLElement | null>;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/50 p-4">
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-changes-title"
        aria-describedby="discard-changes-description"
        onPointerDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl"
      >
        <h2 id="discard-changes-title" className="font-display text-2xl text-foreground">
          Discard unsaved changes?
        </h2>
        <p id="discard-changes-description" className="mt-3 text-sm leading-6 text-muted-foreground">
          The changes in this editor have not been saved.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <SecondaryButton onClick={onDiscard} className="border-danger-foreground text-danger-foreground">
            Discard changes
          </SecondaryButton>
          <PrimaryButton autoFocus onClick={onKeepEditing}>Keep editing</PrimaryButton>
        </div>
      </section>
    </div>
  );
}
