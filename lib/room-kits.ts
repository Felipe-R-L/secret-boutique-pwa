// O que fica guardado dentro de cada quarto do JR Dallas Motel, por id de
// produto. O cardápio impresso (/admin/cardapio) lista na frente os itens do
// quarto informado; sem quarto, só os que todos os quartos têm. Preço e nome
// vêm sempre do cadastro de produtos; aqui só se diz o que está em qual quarto.
//
// Mudou a reposição dos quartos? Edite esta lista. Estes itens aparecem na
// folha mesmo sem estoque cadastrado na loja (já estão no quarto); produto
// removido do cadastro simplesmente não aparece.

export type RoomKit = {
  /** Números dos quartos, como estão na porta ("10", "22"…). */
  rooms: string[];
  productIds: string[];
};

/** Itens presentes em todos os quartos. */
export const ROOM_KIT_ALL: string[] = [
  '0e97a296-c148-44ff-b1c5-b5c8a8285165', // Lubrificante Neutro K-Med 100g
  '438e216a-cf71-45bd-9064-fc3f57af9887', // Vibrador Bullet Estimulador
  '90933afd-9122-4cd2-bfea-f31f85300589', // Bolinha Excitante Hot Ball Plus
  'ffacb7f7-0dde-4db4-a7da-ec655c726ce5', // Gel Térmico Beijável (Yummy)
  'a14e12a4-2889-40ff-9210-84c36e69ed43', // Preservativo Prudence
  'ab0589f4-7184-4833-a172-efea15ca6aa2', // Preservativo Prudence Plus
  '994505c5-28d5-425c-a71b-37b6f67886ce', // Preservativo Olla
  // Nem todo quarto tem; as camareiras anotam a falta na conferência.
  'b85d08e8-e360-4ebc-8f0b-fcd5d0ad6741', // Pomada Chinezinha
];

/** Itens que só alguns quartos têm. Um quarto pode estar em mais de um grupo. */
export const ROOM_KITS: RoomKit[] = [
  {
    rooms: ['13', '18'],
    productIds: [
      '863bf3fa-5785-45cb-bd2c-cb94c7ac53f2', // Algema de Pelúcia (vermelho/preto)
      'd0eab81d-49ce-4e00-8b4a-5533c6f42c30', // Algema de Pelúcia Fur Love
      '83c894a0-e877-4f12-9ddd-3306c98c134d', // Estimulador Porquinho
    ],
  },
  {
    rooms: ['20', '22'],
    productIds: [
      'abdb4c1d-0421-4560-98b4-f64ced14a44a', // Vela de Massagem Intt Verbena
      '18c39975-fdff-4bd8-85b7-7543288de196', // Sugador Woman Suction
    ],
  },
  {
    rooms: ['15'],
    productIds: [
      '8c8fac57-c5f6-4fed-8f65-521a7707fd1b', // Kit Raspadinha Kama Sutra
      '732b847f-592b-4f14-bf46-55646eb5c0fb', // Dados Eróticos
      '18c39975-fdff-4bd8-85b7-7543288de196', // Sugador Woman Suction
    ],
  },
  {
    rooms: ['10', '11', '14', '16', '17', '19', '21', '22'],
    productIds: [
      '1d3e9af0-40e4-469b-9b10-1f1be1a2dc4e', // Gel Hot Ice e Vibra (Xana Loka)
      'feb39001-9e1b-4624-8090-21ab8635a68f', // Melzinho Árabe do Prazer
      'ae13f3ef-dcfe-45c5-8f6b-702da6efad29', // Egg Magical Kiss
    ],
  },
];

/** Ids dos itens de um quarto, sem repetir e na ordem da lista. */
export function roomKitProductIds(room: string): string[] {
  const specific = ROOM_KITS.filter(kit => kit.rooms.includes(room)).flatMap(
    kit => kit.productIds,
  );
  return [...new Set([...ROOM_KIT_ALL, ...specific])];
}
