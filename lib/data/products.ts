import { Product } from "@/lib/store/cart-store";

export const products: Product[] = [
  {
    id: "1",
    name: "Oleo de Massagem Sensual",
    price: 45.9,
    description:
      "Oleo de massagem com fragrancia suave e efeito aquecedor. Perfeito para momentos especiais a dois. Formula desenvolvida com ingredientes naturais que promovem relaxamento e bem-estar.",
    image:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1617897903246-719242758050?w=1000&h=1000&fit=crop",
    ],
    category: "massagem",
    specs: {
      volume: "120ml",
      ingredients: "Oleo de amendoas, vitamina E, fragrancia",
      duration: "Efeito prolongado",
      skin_type: "Todos os tipos de pele",
    },
    rating: 4.8,
    reviews: 127,
    inStock: true,
    stock_quantity: 24,
    variants: [
      {
        id: "1-amber-120",
        sku: "OMS-AMB-120",
        label: "Ambiente Dourado 120ml",
        price: 45.9,
        stock_quantity: 12,
        in_stock: true,
        images: [
          "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1000&h=1000&fit=crop",
          "https://images.unsplash.com/photo-1617897903246-719242758050?w=1000&h=1000&fit=crop",
        ],
        attributes: [
          { key: "Fragrância", value: "Âmbar" },
          { key: "Volume", value: "120ml" },
        ],
        is_default: true,
      },
      {
        id: "1-rose-200",
        sku: "OMS-ROS-200",
        label: "Rosa Veludo 200ml",
        price: 69.9,
        stock_quantity: 12,
        in_stock: true,
        images: [
          "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1000&h=1000&fit=crop",
          "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=1000&h=1000&fit=crop",
        ],
        attributes: [
          { key: "Fragrância", value: "Rosa" },
          { key: "Volume", value: "200ml" },
        ],
      },
    ],
  },
  {
    id: "2",
    name: "Vela Aromatica Relaxante",
    price: 35.0,
    description:
      "Vela aromatica com essencia de baunilha e lavanda. Cria um ambiente aconchegante e relaxante. Feita artesanalmente com cera de soja natural e pavio de algodao.",
    image:
      "https://images.unsplash.com/photo-1602607446364-d37774451ea6?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1602607446364-d37774451ea6?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&h=1000&fit=crop",
    ],
    category: "destaques",
    specs: {
      burn_time: "40 horas",
      weight: "200g",
      ingredients: "Cera de soja, oleos essenciais",
      fragrance: "Baunilha e lavanda",
    },
    rating: 4.9,
    reviews: 89,
    inStock: true,
  },
  {
    id: "3",
    name: "Kit Dados Eroticos",
    price: 29.9,
    description:
      "Kit com 3 dados para brincadeiras a dois. Inclui dado de acoes, posicoes e partes do corpo. Material premium com acabamento acetinado.",
    image:
      "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1000&h=1000&fit=crop",
    ],
    category: "brinquedos",
    specs: {
      quantity: "3 dados",
      material: "Acrilico premium",
      size: "2.5cm cada",
      content: "18+ combinacoes",
    },
    rating: 4.5,
    reviews: 64,
    inStock: true,
  },
  {
    id: "4",
    name: "Gel Beijavel Morango",
    price: 25.0,
    description:
      "Gel beijavel sabor morango com efeito comestivel. Nao mancha e nao gruda. Formula segura e dermatologicamente testada.",
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=1000&h=1000&fit=crop",
    ],
    category: "destaques",
    specs: {
      volume: "35ml",
      flavor: "Morango",
      texture: "Gel suave",
      safety: "Dermatologicamente testado",
    },
    rating: 4.7,
    reviews: 156,
    inStock: true,
  },
  {
    id: "5",
    name: "Pluma para Caricias",
    price: 19.9,
    description:
      "Pluma macia para caricias sensuais. Ideal para preliminares. Cabo em acrilico com penas naturais selecionadas.",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=1000&h=1000&fit=crop",
    ],
    category: "brinquedos",
    specs: {
      length: "25cm",
      material: "Penas naturais, cabo acrilico",
      color: "Preto",
      care: "Limpar com pano seco",
    },
    rating: 4.4,
    reviews: 42,
    inStock: true,
  },
  {
    id: "6",
    name: "Locao Hidratante Corpo",
    price: 55.0,
    description:
      "Locao hidratante corporal com efeito sedoso. Fragrancia suave e duradoura. Enriquecida com manteigas naturais.",
    image:
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1617897903246-719242758050?w=1000&h=1000&fit=crop",
    ],
    category: "massagem",
    specs: {
      volume: "200ml",
      ingredients: "Manteiga de karite, oleo de coco",
      absorption: "Rapida absorcao",
      skin_type: "Todos os tipos de pele",
    },
    rating: 4.6,
    reviews: 98,
    inStock: true,
  },
  {
    id: "7",
    name: "Venda Cetim Premium",
    price: 39.9,
    description:
      "Venda em cetim premium para brincadeiras. Ajustavel e confortavel. Elastico macio que nao marca a pele.",
    image:
      "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1000&h=1000&fit=crop",
    ],
    category: "brinquedos",
    specs: {
      material: "Cetim premium",
      size: "Ajustavel",
      color: "Preto",
      care: "Lavar a mao",
    },
    rating: 4.8,
    reviews: 73,
    inStock: true,
  },
  {
    id: "8",
    name: "Oleo Corporal Brilho",
    price: 49.9,
    description:
      "Oleo corporal com particulas de brilho. Hidrata e deixa a pele com aspecto luminoso. Efeito champagne dourado.",
    image:
      "https://images.unsplash.com/photo-1617897903246-719242758050?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1617897903246-719242758050?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1000&h=1000&fit=crop",
    ],
    category: "massagem",
    specs: {
      volume: "100ml",
      effect: "Brilho dourado",
      ingredients: "Oleo de argan, particulas de brilho",
      duration: "Longa duracao",
    },
    rating: 4.9,
    reviews: 145,
    inStock: true,
  },
  {
    id: "9",
    name: "Kit Petalas de Rosa",
    price: 22.0,
    description:
      "Kit com 100 petalas de rosa artificiais para decoracao romantica. Reutilizavel e sem perfume. Ideal para criar ambientes especiais.",
    image:
      "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1602607446364-d37774451ea6?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1000&h=1000&fit=crop",
    ],
    category: "destaques",
    specs: {
      quantity: "100 petalas",
      material: "Seda artificial",
      reusable: "Sim",
      color: "Vermelho",
    },
    rating: 4.3,
    reviews: 58,
    inStock: true,
  },
  {
    id: "10",
    name: "Chicote Sensual Suave",
    price: 45.0,
    description:
      "Chicote sensual com tiras em couro sintetico. Design elegante em preto. Ideal para iniciantes que desejam explorar novas sensacoes.",
    image:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=1000&h=1000&fit=crop",
    ],
    category: "brinquedos",
    specs: {
      length: "45cm",
      material: "Couro sintetico premium",
      intensity: "Suave",
      handle: "Ergonomico",
    },
    rating: 4.6,
    reviews: 67,
    inStock: true,
  },
];

export const categories = [
  { id: "destaques", label: "Destaques", icon: "sparkles" },
  { id: "massagem", label: "Massagem", icon: "droplets" },
  { id: "brinquedos", label: "Brinquedos", icon: "heart" },
] as const;

export type Category = (typeof categories)[number]["id"];

export function getRelatedProducts(productId: string, limit = 4): Product[] {
  const product = products.find((p) => p.id === productId);
  if (!product) return [];

  return products
    .filter((p) => p.id !== productId && p.category === product.category)
    .slice(0, limit);
}
