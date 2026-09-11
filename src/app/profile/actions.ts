"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface ProfileFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface AccountDeletionState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function updateProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const profile = await requireCustomer("/profile");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (fullName.length < 2 || fullName.length > 100) {
    return {
      status: "error",
      message: "Enter a name between 2 and 100 characters.",
      fieldErrors: { fullName: "Enter a name between 2 and 100 characters." },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", profile.id);

  if (error) {
    return { status: "error", message: "Your profile could not be saved. Please try again." };
  }

  revalidatePath("/profile");
  return { status: "success", message: "Your profile was updated." };
}

export async function requestAccountDeletionAction(
  _previousState: AccountDeletionState,
  formData: FormData,
): Promise<AccountDeletionState> {
  await requireCustomer("/profile");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== "DELETE") {
    return { status: "error", message: "Type DELETE exactly to continue." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("request_account_deletion");

  if (error) {
    const message = error.message.includes("orders are active")
      ? "Resolve active orders before scheduling account deletion."
      : error.message.includes("Admin accounts")
        ? "Admin accounts must be removed through the controlled administrator process."
        : "Account deletion could not be scheduled. Please try again.";
    return { status: "error", message };
  }

  revalidatePath("/profile");
  return { status: "success", message: "Account deletion is scheduled in 90 days." };
}

export async function cancelAccountDeletionAction(
  _previousState: AccountDeletionState,
): Promise<AccountDeletionState> {
  void _previousState;
  await requireCustomer("/profile");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("cancel_account_deletion");

  if (error) {
    return {
      status: "error",
      message: "Account deletion could not be cancelled. Please try again.",
    };
  }

  revalidatePath("/profile");
  return { status: "success", message: "Account deletion was cancelled." };
}
