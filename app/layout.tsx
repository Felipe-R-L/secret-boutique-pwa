import React from 'react';
import type { Metadata } from 'next';
import { Geist_Mono, Playfair_Display, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from 'sonner';
import { CartHydration } from '@/components/cart-hydration';
import { CartBar } from '@/components/cart-bar';
import { AgeGate } from '@/components/age-gate';
import { RoomParamCapture } from '@/components/room-param-capture';
import { WhatsappFab } from '@/components/whatsapp-fab';
import { PageViewTracker } from '@/components/analytics/page-view-tracker';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

// Geist Mono só aparece nos códigos de pedido: sem preload nas outras páginas.
const _geistMono = Geist_Mono({ subsets: ['latin'], preload: false });
const _playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});
const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  manifest: '/manifest.webmanifest',
  title: {
    default: `${SITE_NAME} | Sex Shop em Pitangueiras com Entrega Discreta`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Sex shop e boutique de bem-estar íntimo em Pitangueiras/SP. Compre sem cadastro, receba em embalagem discreta e retire anonimamente no JR Dallas Motel ou receba por motoboy.',
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  openGraph: {
    siteName: SITE_NAME,
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='pt-BR'>
      <body className={`font-sans antialiased`}>
        <CartHydration />
        <RoomParamCapture />
        <PageViewTracker />
        {children}
        <CartBar />
        <WhatsappFab />
        <AgeGate />
        <Toaster
          position='bottom-center'
          mobileOffset={{ bottom: 88 }}
          toastOptions={{
            style: {
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: 0,
            },
          }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
