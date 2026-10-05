import type { Metadata } from 'next';
import { NO_INDEX } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Finalizar Pedido',
  robots: NO_INDEX,
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
