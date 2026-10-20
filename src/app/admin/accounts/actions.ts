"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/identifiers";
import type { AccountRole } from "@/lib/roles";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceMutationRateLimit } from "@/lib/server-rate-limit";

export async function assignAccountRole(input: {
  userId: string;
  expectedRole: AccountRole;
  nextRole: AccountRole;
}) {
  const actor = await requireAdmin("/admin/accounts");
  const roles = ["customer", "staff", "admin"];
  if (
    !isUuid(input.userId) ||
    !roles.includes(input.expectedRole) ||
    !roles.includes(input.nextRole) ||
    input.userId === actor.id
  ) {
    return { status: "error" as const, message: "Choose another account and a valid role." };
  }
  try {
    await enforceMutationRateLimit({
      scope: "assign-role",
      userId: actor.id,
      maximumRequests: 20,
      windowSeconds: 300,
    });
    const { error } = await createAdminSupabaseClient().rpc("assign_account_role", {
      target_admin_id: actor.id,
      target_user_id: input.userId,
      expected_role: input.expectedRole,
      next_role: input.nextRole,
    });
    if (error)
      return {
        status: "error" as const,
        message:
          "Role was not changed. Check active orders, pending deletion, Admin limits and the current role, then refresh.",
      };
    revalidatePath("/admin/accounts");
    revalidatePath("/admin/customers");
    revalidatePath("/admin");
    return { status: "success" as const, message: "Account role updated and audited." };
  } catch {
    return {
      status: "error" as const,
      message: "Role assignment is temporarily unavailable. Refresh before retrying.",
    };
  }
}
