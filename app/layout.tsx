import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});
const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "The Secret Boutique | Bem-estar Sexual e Autocuidado",
  description:
    "Sua boutique íntima de autocuidado e bem-estar sexual em Pitangueiras. Produtos selecionados de qualidade com retirada discreta e anônima no JR Dallas Motel.",
  keywords: [
    "bem-estar sexual",
    "autocuidado",
    "boutique íntima",
    "sex shop pitangueiras",
    "produtos de beleza",
    "cosméticos íntimos",
    "retirada anônima",
    "JR Dallas Motel",
  ],
  authors: [{ name: "The Secret Boutique" }],
  openGraph: {
    title: "The Secret Boutique | Bem-estar Sexual e Autocuidado",
    description:
      "Sua boutique íntima de autocuidado e bem-estar sexual em Pitangueiras. Retirada 100% anônima.",
    url: "https://thesecretboutique.com.br", // Replace with actual domain later
    siteName: "The Secret Boutique",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Secret Boutique",
    description: "Autocuidado e bem-estar sexual com total privacidade.",
  },
  icons: {
    icon: [
      {
        url: "/icon.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.png",
        type: "image/png",
      },
    ],
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "AdultBoutique",
              name: "The Secret Boutique",
              description:
                "Boutique íntima focada em bem-estar sexual, autocuidado e produtos de beleza. Oferecemos um processo de compra online com retirada 100% anônima e discreta.",
              url: "https://thesecretboutique.com.br",
              telephone: "", // Add if they have one
              address: {
                "@type": "PostalAddress",
                addressLocality: "Pitangueiras",
                addressRegion: "SP",
                addressCountry: "BR",
              },
              department: {
                "@type": "LocalBusiness",
                name: "Ponto de Retirada - JR Dallas Motel",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "Pitangueiras",
                  addressRegion: "SP",
                  addressCountry: "BR",
                },
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ],
                  opens: "14:00",
                  closes: "05:00",
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "transparent",
              border: "none",
              boxShadow: "none",
              padding: 0,
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}

