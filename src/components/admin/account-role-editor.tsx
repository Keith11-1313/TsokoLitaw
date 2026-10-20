"use client";

import { useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { assignAccountRole } from "@/app/admin/accounts/actions";
import type { AccountRole } from "@/lib/roles";
import { CustomSelect } from "@/components/ui/custom-select";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { useEditorDialog } from "@/hooks/use-editor-dialog";

export function AccountRoleEditor({
  userId,
  role,
  name,
  disabled,
}: {
  userId: string;
  role: AccountRole;
  name: string;
  disabled: boolean;
}) {
  const [nextRole, setNextRole] = useState(role);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <>
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && !pending && role !== nextRole) setConfirming(true);
        }}
      >
        <CustomSelect
          label={`Role for ${name}`}
          hideLabel
          value={nextRole}
          disabled={disabled || pending}
          onChange={(value) => setNextRole(value as AccountRole)}
          options={[
            { value: "customer", label: "Customer" },
            { value: "staff", label: "Staff" },
            { value: "admin", label: "Admin" },
          ]}
          className="min-w-36"
        />
        <PrimaryButton
          type="submit"
          disabled={disabled || pending || role === nextRole}
          className="whitespace-nowrap px-4"
        >
          {pending ? "Saving…" : "Assign role"}
        </PrimaryButton>
        {message ? (
          <p role="status" className="w-full text-sm">
            {message}
          </p>
        ) : null}
      </form>
      {confirming ? (
        <RoleConfirmation
          name={name}
          role={role}
          nextRole={nextRole}
          pending={pending}
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            startTransition(async () => {
              const result = await assignAccountRole({ userId, expectedRole: role, nextRole });
              setMessage(result.message);
              setConfirming(false);
              if (result.status === "success") router.refresh();
            });
          }}
        />
      ) : null}
    </>
  );
}

function RoleConfirmation({
  name,
  role,
  nextRole,
  pending,
  onClose,
  onConfirm,
}: {
  name: string;
  role: AccountRole;
  nextRole: AccountRole;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const { dialogRef, requestClose } = useEditorDialog({ isDirty: false, pending, onClose });
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/40 p-4"
      onPointerDown={requestClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onPointerDown={(event) => event.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="pt-1 font-display text-2xl">
            Change account role?
          </h2>
          <button
            type="button"
            disabled={pending}
            aria-label="Close role confirmation"
            onClick={requestClose}
            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <p id={descriptionId} className="mt-2 break-words text-sm leading-6 text-muted-foreground">
          Change access for <strong className="text-foreground">{name}</strong>. This takes effect
          on their next request and is recorded in the audit log.
        </p>
        <div className="my-5 flex items-center justify-center gap-4 rounded-control bg-surface-muted p-4 font-bold capitalize">
          <span>{role}</span>
          <ArrowRight aria-hidden="true" size={18} />
          <span>{nextRole}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {nextRole === "admin"
            ? "Admin manages the business and account roles, but cannot process transactions."
            : nextRole === "staff"
              ? "Staff processes customer orders and payments, but cannot change business settings or roles."
              : "Customer can shop and manage their own orders, with no business workspace access."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <SecondaryButton type="button" disabled={pending} onClick={requestClose}>
            Keep current role
          </SecondaryButton>
          <PrimaryButton type="button" disabled={pending} onClick={onConfirm}>
            {pending ? "Saving…" : "Confirm change"}
          </PrimaryButton>
        </div>
      </section>
    </div>,
    document.body,
  );
}
