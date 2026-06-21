// Contatos públicos da loja, centralizados. Pode sobrescrever por env
// (NEXT_PUBLIC_*) sem mexer no código — útil para staging vs produção.

// Número de WhatsApp em formato internacional, SOMENTE DÍGITOS:
// 55 (Brasil) + DDD + número. Ex.: "5516999999999".
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5516997118118';

// Mensagem pré-preenchida ao abrir a conversa.
export const WHATSAPP_DEFAULT_MESSAGE =
  'Olá! Vim pelo site da The Secret Boutique 💕';

// Perfil do Instagram (URL completa) e handle exibido.
export const INSTAGRAM_HANDLE =
  process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? 'tsecret_boutique';
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

/** Link wa.me com a mensagem pré-preenchida. */
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_DEFAULT_MESSAGE,
)}`;
