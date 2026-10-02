import { createBrowserClient } from '@supabase/ssr';
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from '@/lib/supabase/config';

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    // Heartbeat do realtime num Web Worker: em aba de fundo o navegador
    // atrasa os timers da página e a conexão caía sem avisar.
    realtime: { worker: true },
  });
}
