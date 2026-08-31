"use client";

import Image from "next/image";
import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "@/app/profile/actions";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/button";
import { FormStatusHint } from "@/components/ui/form-status-hint";
import { useFormGate } from "@/hooks/use-form-gate";

const initialState: ProfileFormState = { status: "idle", message: "" };

export function ProfileForm({ fullName, email, mobileNumber }: { fullName: string; email: string; mobileNumber: string | null }) {
  const [state, action, isPending] = useActionState(updateProfileAction, initialState);
  const { formRef, formProps, canSubmit, statusMessage } = useFormGate({ requireDirty: true });

  return (
    <form ref={formRef} {...formProps} action={action} className="rounded-card border border-border bg-surface p-6 sm:p-8">
      <div className="flex items-center gap-3 border-b border-border pb-5">
        <Image
          src="/brand/logo.png"
          alt="TsokoLitaw"
          width={44}
          height={44}
          className="size-11 object-contain"
          priority
        />
        <h2 className="font-display text-2xl text-foreground">Personal details</h2>
      </div>
      <div className="mt-6 space-y-5">
        <FormField id="profile-name" label="Full name" required error={state.fieldErrors?.fullName} inputProps={{ name: "fullName", defaultValue: fullName, autoComplete: "name", minLength: 2, maxLength: 100 }} />
        <FormField id="profile-email" label="Google email" hint="Your email is managed by Google and cannot be edited here." inputProps={{ value: email, readOnly: true, autoComplete: "email" }} />
        <FormField id="profile-mobile" label="Mobile number (optional)" error={state.fieldErrors?.mobileNumber} hint="Add a number only if you also want pickup updates by phone." inputProps={{ name: "mobileNumber", type: "tel", defaultValue: mobileNumber ?? "", placeholder: "+63 900 000 0000", autoComplete: "tel", maxLength: 30 }} />
      </div>
      <FormStatusHint className="mt-5" message={statusMessage} />
      <PrimaryButton className="mt-3" type="submit" disabled={isPending || !canSubmit}>{isPending ? "Saving…" : "Save profile"}</PrimaryButton>
      {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`mt-4 rounded-control p-3 text-sm ${state.status === "error" ? "bg-danger-background text-danger-foreground" : "bg-success-background text-success-foreground"}`}>{state.message}</p> : null}
    </form>
  );
}
