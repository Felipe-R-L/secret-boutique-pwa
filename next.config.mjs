/** @type {import('next').NextConfig} */

// Domínio de produção. O alias *.vercel.app de produção redireciona para cá
// (conteúdo duplicado em dois hosts divide a indexação). /api fica de fora:
// webhooks (Mercado Pago) podem estar cadastrados no host antigo e não seguem
// redirect em POST.
const CANONICAL_ORIGIN = "https://secret-boutique.com.br";
const LEGACY_HOST = "secret-boutique-pwa.vercel.app";

// CSP em modo Report-Only: o navegador só avisa no console, não bloqueia.
// Depois de alguns dias sem violações, trocar para Content-Security-Policy.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://viacep.com.br",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async redirects() {
    const legacyHost = [{ type: "host", value: LEGACY_HOST }];
    return [
      {
        source: "/",
        has: legacyHost,
        destination: `${CANONICAL_ORIGIN}/`,
        permanent: true,
      },
      {
        source: "/:path((?!api/).+)",
        has: legacyHost,
        destination: `${CANONICAL_ORIGIN}/:path`,
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Reforço ao robots.txt: áreas privadas nunca entram no índice.
        source: "/:path(admin|auth|api)/:rest*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
