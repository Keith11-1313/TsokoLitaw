"use client";

import Image from "next/image";
import { useActionState } from "react";
import { LockKeyhole, UserRound } from "lucide-react";
import { updateProfileAction, type ProfileFormState } from "@/app/profile/actions";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/button";
import { FormStatusHint } from "@/components/ui/form-status-hint";
import { useFormGate } from "@/hooks/use-form-gate";

const initialState: ProfileFormState = { status: "idle", message: "" };

export function ProfileForm({
  fullName,
  email,
  avatarUrl,
}: {
  fullName: string;
  email: string;
  avatarUrl: string | null;
}) {
  const [state, action, isPending] = useActionState(updateProfileAction, initialState);
  const { formRef, formProps, canSubmit, statusMessage } = useFormGate({ requireDirty: true });

  return (
    <form
      ref={formRef}
      {...formProps}
      action={action}
      className="rounded-card border border-border bg-surface p-6 sm:p-8"
    >
      <div className="flex items-center gap-3 border-b border-border pb-5">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Your Google profile photo"
            width={44}
            height={44}
            className="size-11 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-brand">
            <UserRound aria-hidden="true" size={20} />
          </span>
        )}
        <h2 className="font-display text-2xl text-foreground">Personal details</h2>
      </div>
      <div className="mt-6 space-y-5">
        <FormField
          id="profile-name"
          label="Full name"
          required
          error={state.fieldErrors?.fullName}
          inputProps={{
            name: "fullName",
            defaultValue: fullName,
            autoComplete: "name",
            minLength: 2,
            maxLength: 100,
          }}
        />
        <div className="relative">
          <FormField
            id="profile-email"
            label={
              <span>
                Google email
                <em className="ml-1 font-normal text-muted-foreground">Managed by Google</em>
              </span>
            }
            inputProps={{ value: email, readOnly: true, autoComplete: "email" }}
            controlClassName="pr-11"
          />
          <LockKeyhole
            aria-hidden="true"
            size={18}
            className="pointer-events-none absolute bottom-4 right-4 text-muted-foreground"
          />
        </div>
      </div>
      <FormStatusHint className="sr-only" message={statusMessage} />
      <div className="mt-6 flex justify-end">
        <PrimaryButton type="submit" disabled={isPending || !canSubmit}>
          {isPending ? "Saving…" : "Save profile"}
        </PrimaryButton>
      </div>
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-4 rounded-control p-3 text-sm ${state.status === "error" ? "bg-danger-background text-danger-foreground" : "bg-success-background text-success-foreground"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
