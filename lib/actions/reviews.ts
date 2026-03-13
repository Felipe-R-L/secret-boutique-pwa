"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { submitAnonymousReviewSchema } from "@/lib/schemas";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function resolveClientIp(headersStore: Headers): string | null {
  const forwardedFor = headersStore.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headersStore.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfConnectingIp = headersStore.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  return null;
}

function toIpHash(ip: string) {
  const pepper =
    process.env.REVIEW_IP_HASH_SECRET ?? "default-review-ip-secret-change-me";
  return createHash("sha256").update(`${pepper}:${ip}`).digest("hex");
}

export async function submitAnonymousReview(data: unknown) {
  const parsed = submitAnonymousReviewSchema.safeParse(data);

  if (!parsed.success) {
    return {
      ok: false as const,
      error:
        parsed.error.flatten().formErrors.join(", ") ||
        "Dados invalidos para avaliacao anonima",
    };
  }

  const headersStore = await headers();
  const ip = resolveClientIp(headersStore);

  if (!ip) {
    return {
      ok: false as const,
      error:
        "Nao foi possivel identificar o IP para validar limite de avaliacao.",
    };
  }

  const ipHash = toIpHash(ip);

  const supabase = createServiceRoleClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", parsed.data.productId)
    .maybeSingle();

  if (productError || !product) {
    return {
      ok: false as const,
      error: productError?.message ?? "Produto nao encontrado",
    };
  }

  const { error } = await supabase.from("reviews").insert({
    product_id: parsed.data.productId,
    ip_hash: ipHash,
    rating: parsed.data.rating,
    comment: parsed.data.comment?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false as const,
        error: "Este IP ja enviou uma avaliacao para este produto.",
      };
    }

    return { ok: false as const, error: error.message };
  }

  revalidatePath("/");
  return { ok: true as const };
}
