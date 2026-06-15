import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AdminRole = "ADMIN" | "STAFF";

export type AdminContext = {
  userId: string;
  email: string;
  role: AdminRole;
};

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("id,email,role")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && data) {
    return {
      userId: data.id,
      email: data.email,
      role: data.role,
    };
  }

  const autoGrantEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTO_GRANT_ADMIN === "true";

  if (!autoGrantEnabled) {
    return null;
  }

  const serviceRoleClient = createServiceRoleClient();
  const { data: upserted, error: upsertError } = await serviceRoleClient
    .from("admin_users")
    .upsert(
      {
        id: user.id,
        email: user.email ?? "",
        role: "ADMIN",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id,email,role")
    .single();

  if (upsertError || !upserted) {
    return null;
  }

  return {
    userId: upserted.id,
    email: upserted.email,
    role: upserted.role,
  };
}

export async function requireAdminContext(options?: {
  write?: boolean;
  adminOnly?: boolean;
}) {
  const context = await getAdminContext();

  if (!context) {
    throw new Error("Unauthorized");
  }

  // `write` (mutations) e `adminOnly` (leituras sensíveis) exigem ADMIN.
  if ((options?.write || options?.adminOnly) && context.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  return context;
}

/**
 * Page-level guard for the admin area. Unlike `requireAdminContext` (which
 * throws — appropriate for server actions), this redirects gracefully:
 * unauthenticated visitors go to login, and STAFF hitting an ADMIN-only page
 * are sent to the orders dashboard (the only area STAFF can use).
 */
export async function requireAdminPage(options?: { adminOnly?: boolean }) {
  const context = await getAdminContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (options?.adminOnly && context.role !== "ADMIN") {
    redirect("/admin/orders");
  }

  return context;
}
