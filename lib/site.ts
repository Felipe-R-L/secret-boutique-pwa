// Dados públicos da loja usados em metadata, JSON-LD, sitemap e rodapé.
// Endereço e coordenadas são os do JR Dallas Motel, onde a loja atende e
// entrega os pedidos — o mesmo endereço do Perfil da Empresa no Google.
// Mantenha os dois em sincronia (NAP consistente).

export const SITE_URL = 'https://secret-boutique.com.br';
export const SITE_NAME = 'The Secret Boutique';
export const CONTACT_EMAIL = 'contato@secret-boutique.com.br';

export const STORE_ADDRESS = {
  streetAddress: 'Estrada Municipal Pitangueiras-Viradouro, km 3,5',
  addressLocality: 'Pitangueiras',
  addressRegion: 'SP',
  postalCode: '14750-000',
  addressCountry: 'BR',
} as const;

export const STORE_GEO = { latitude: -21.0096, longitude: -48.2225 } as const;

// Horário de atendimento e retirada (atravessa a meia-noite).
export const STORE_HOURS = { opens: '14:00', closes: '05:00' } as const;
export const STORE_HOURS_LABEL = 'todos os dias, das 14h às 5h';

export const PICKUP_PLACE_NAME = 'JR Dallas Motel';

/** URL absoluta a partir de um caminho ("/sobre" → "https://…/sobre"). */
export function absoluteUrl(path = '/'): string {
  return new URL(path, SITE_URL).toString();
}
