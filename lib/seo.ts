import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

type PageMetadataInput = {
  /** Título sem o sufixo da marca (o template do layout acrescenta). */
  title: string;
  description: string;
  /** Caminho canônico da página, ex.: "/sobre". */
  path: string;
  /** Título já com a marca, quando não deve passar pelo template. */
  absoluteTitle?: boolean;
  images?: string[];
};

// Canonical + Open Graph + Twitter por página. Sem isso, toda página herda
// og:url/og:title da home e não declara canonical.
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  images,
}: PageMetadataInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: 'pt_BR',
      type: 'website',
      ...(images?.length ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      ...(images?.length ? { images } : {}),
    },
  };
}

export const NO_INDEX: Metadata['robots'] = {
  index: false,
  follow: false,
};
