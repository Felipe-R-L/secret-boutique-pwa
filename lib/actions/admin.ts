"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/auth/admin";
import { logAudit } from "@/lib/audit/log";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  upsertAdminUserSchema,
  updateStoreCategoriesSchema,
  updateStoreSettingsSchema,
} from "@/lib/schemas";

const DEFAULT_HERO_TITLE = "Descubra o prazer do autocuidado";
const DEFAULT_HERO_SUBTITLE =
  "Produtos premium selecionados para transformar seus momentos especiais em experiencias inesqueciveis.";

export async function listAdminUsers() {
  await requireAdminContext({ adminOnly: true });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id,email,role,created_at,updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false as const, error: error.message, data: [] };
  }

  return { ok: true as const, data };
}

export async function upsertAdminUser(input: unknown) {
  const context = await requireAdminContext({ write: true });

  const parsed = upsertAdminUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.flatten().formErrors.join(", ") || "Invalid payload",
    };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_users").upsert(
    {
      id: parsed.data.id,
      email: parsed.data.email,
      role: parsed.data.role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  await logAudit(
    {
      action: "admin_user.upsert",
      category: "admin_user",
      targetType: "admin_user",
      targetId: parsed.data.id,
      targetLabel: parsed.data.email,
      metadata: { role: parsed.data.role },
    },
    context,
  );

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function removeAdminUser(input: unknown) {
  const context = await requireAdminContext({ write: true });

  if (
    typeof input !== "object" ||
    input === null ||
    !("id" in input) ||
    typeof (input as { id?: unknown }).id !== "string"
  ) {
    return { ok: false as const, error: "Invalid payload" };
  }

  const supabase = createServiceRoleClient();
  const targetId = (input as { id: string }).id;
  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("id", targetId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  await logAudit(
    {
      action: "admin_user.remove",
      category: "admin_user",
      targetType: "admin_user",
      targetId,
    },
    context,
  );

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function updateStoreSettings(input: unknown) {
  const context = await requireAdminContext({ write: true });

  const parsed = updateStoreSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.flatten().formErrors.join(", ") || "Invalid payload",
    };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("store_settings").upsert(
    {
      id: 1,
      hero_title: parsed.data.heroTitle,
      hero_subtitle: parsed.data.heroSubtitle,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  await logAudit(
    {
      action: "settings.update_hero",
      category: "settings",
      metadata: { heroTitle: parsed.data.heroTitle },
    },
    context,
  );

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/products");
  return { ok: true as const };
}

export async function updateStoreCategories(input: unknown) {
  const context = await requireAdminContext({ write: true });

  const parsed = updateStoreCategoriesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.flatten().formErrors.join(", ") || "Invalid payload",
    };
  }

  const supabase = createServiceRoleClient();
  const { data: existing, error: lookupError } = await supabase
    .from("store_settings")
    .select("id,hero_title,hero_subtitle")
    .eq("id", 1)
    .maybeSingle();

  if (lookupError) {
    return { ok: false as const, error: lookupError.message };
  }

  const mutation = existing
    ? supabase
        .from("store_settings")
        .update({
          categories: parsed.data.categories,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1)
    : supabase.from("store_settings").insert({
        id: 1,
        hero_title: DEFAULT_HERO_TITLE,
        hero_subtitle: DEFAULT_HERO_SUBTITLE,
        categories: parsed.data.categories,
        updated_at: new Date().toISOString(),
      });

  const { error } = await mutation;

  if (error) {
    return { ok: false as const, error: error.message };
  }

  await logAudit(
    {
      action: "settings.update_categories",
      category: "settings",
      metadata: { count: parsed.data.categories.length },
    },
    context,
  );

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/products");
  return { ok: true as const };
}
