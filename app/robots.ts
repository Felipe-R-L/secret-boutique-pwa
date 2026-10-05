import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

// Áreas privadas ou transacionais ficam fora do índice. Crawlers de IA
// (GPTBot, ClaudeBot, PerplexityBot…) seguem a mesma regra geral.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/auth/', '/cart', '/checkout', '/pedidos'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
