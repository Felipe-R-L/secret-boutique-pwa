import type { Metadata } from 'next';
import { NO_INDEX } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Meus Pedidos',
  robots: NO_INDEX,
};

export default function PedidosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
