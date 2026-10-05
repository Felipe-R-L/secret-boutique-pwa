import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from '@/lib/supabase/config';

// Cliente anônimo, sem cookies: para leituras públicas da vitrine (catálogo)
// que precisam ser cacheáveis (ISR). Ler cookies() torna a rota dinâmica.
export function createPublicClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
