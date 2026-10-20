"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignAccountRole } from "@/app/admin/accounts/actions";
import type { AccountRole } from "@/lib/roles";
import { CustomSelect } from "@/components/ui/custom-select";

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
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          !window.confirm(
            `Change ${name} from ${role} to ${nextRole}? This changes their system access and is audited.`,
          )
        )
          return;
        startTransition(async () => {
          const result = await assignAccountRole({ userId, expectedRole: role, nextRole });
          setMessage(result.message);
          if (result.status === "success") router.refresh();
        });
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
      <button
        disabled={disabled || pending || role === nextRole}
        className="min-h-11 rounded-full bg-brand px-4 text-surface disabled:opacity-50"
      >
        {pending ? "Saving…" : "Assign role"}
      </button>
      {message ? (
        <p role="status" className="w-full text-sm">
          {message}
        </p>
      ) : null}
    </form>
  );
}
