"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface ProfileFormState {
  status: "idle" | "success" | "error";
  message: string;
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
  const mobileNumber = String(formData.get("mobileNumber") ?? "").trim();

  if (fullName.length < 2 || fullName.length > 100) {
    return { status: "error", message: "Enter a name between 2 and 100 characters." };
  }

  if (mobileNumber.length > 30) {
    return { status: "error", message: "Mobile number must be 30 characters or fewer." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, mobile_number: mobileNumber || null })
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
    const message = error.message.includes("orders or refunds are active")
      ? "Resolve active orders or refunds before scheduling account deletion."
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
    return { status: "error", message: "Account deletion could not be cancelled. Please try again." };
  }

  revalidatePath("/profile");
  return { status: "success", message: "Account deletion was cancelled." };
}
