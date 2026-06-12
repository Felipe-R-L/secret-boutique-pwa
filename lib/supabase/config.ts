function requireEnv(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

export function getSupabaseUrl(): string {
  return requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    'Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL',
  );
}

export function getSupabasePublishableKey(): string {
  return requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  );
}
