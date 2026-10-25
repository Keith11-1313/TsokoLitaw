import "server-only";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { auditDayAfter, normalizeAuditFilters, summarizeAuditChange } from "@/lib/audit-log";
import { isEntityId } from "@/lib/identifiers";

export async function getAdminAuditLog(parameters: Record<string, unknown>) {
  await requireAdmin("/admin/audit");
  const filters = normalizeAuditFilters(parameters);
  const client = await createServerSupabaseClient();
  let query = client
    .from("admin_audit_logs")
    .select(
      "id,admin_id,action,entity_type,entity_id,metadata,created_at,profiles!admin_audit_logs_admin_id_fkey(full_name,email)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (filters.area) query = query.like("action", `${filters.area}.%`);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00+08:00`);
  if (filters.to) query = query.lt("created_at", `${auditDayAfter(filters.to)}T00:00:00+08:00`);
  const term = filters.q.replace(/[^\p{L}\p{N}\s@+.'-]/gu, "").trim();
  if (filters.q && !term) query = query.eq("id", "0");
  else if (term) {
    // Search actor names/emails without a privileged Auth directory request.
    const actors = await client
      .from("profiles")
      .select("id")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(1000);
    if (actors.error) throw new Error("Audit search could not be loaded.");
    const ids = (actors.data ?? []).map((actor) => actor.id).filter(isEntityId);
    query = query.or(
      `action.ilike.%${term}%,entity_type.ilike.%${term}%,entity_id.ilike.%${term}%${ids.length ? `,admin_id.in.(${ids.join(",")})` : ""}`,
    );
  }
  const { data, error, count } = await query.range(
    (filters.page - 1) * filters.size,
    filters.page * filters.size - 1,
  );
  if (error) throw new Error("Audit log could not be loaded.");
  const accountIds = [
    ...new Set(
      (data ?? [])
        .filter((row) => row.entity_type === "profile" && isEntityId(row.entity_id ?? ""))
        .map((row) => row.entity_id!),
    ),
  ];
  const orderIds = [
    ...new Set(
      (data ?? [])
        .filter((row) => row.entity_type === "order" && isEntityId(row.entity_id ?? ""))
        .map((row) => row.entity_id!),
    ),
  ];
  const [accounts, orders] = await Promise.all([
    accountIds.length
      ? client.from("profiles").select("id,full_name,email").in("id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? client.from("orders").select("id,order_number").in("id", orderIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (accounts.error || orders.error) throw new Error("Audit targets could not be loaded.");
  const names = new Map(
    (accounts.data ?? []).map((account) => [account.id, account.full_name || account.email]),
  );
  const numbers = new Map((orders.data ?? []).map((order) => [order.id, order.order_number]));
  return {
    filters,
    totalCount: count ?? 0,
    entries: (data ?? []).map((row) => ({
      id: row.id,
      action: row.action.slice(0, 100),
      entityType: row.entity_type.slice(0, 80),
      entityId: isEntityId(row.entity_id ?? "") ? row.entity_id! : "",
      target:
        names.get(row.entity_id ?? "") ??
        numbers.get(row.entity_id ?? "") ??
        row.entity_type.replaceAll("_", " "),
      actorName: row.profiles?.full_name || "Business account",
      actorEmail: row.profiles?.email ?? "",
      createdAt: row.created_at,
      change: summarizeAuditChange(row.action, row.metadata),
    })),
  };
}
