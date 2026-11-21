import { useLocation } from 'react-router-dom';
import { absoluteUrl, DEFAULT_DESCRIPTION, OG_IMAGE, SITE_NAME } from '@/lib/site';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

/**
 * Per-route metadata using React 19's built-in document metadata: <title>, <meta> and <link>
 * rendered anywhere are hoisted into <head>. Static copies for crawlers are generated at build
 * time by scripts/postbuild.mjs.
 */
export function Seo({ title, description = DEFAULT_DESCRIPTION, image = OG_IMAGE, type = 'website', noindex, jsonLd }: SeoProps) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} — Waqar Yunus` : SITE_NAME;
  const url = absoluteUrl(pathname);
  const img = image.startsWith('http') ? image : absoluteUrl(image);
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:site_name" content="WAQAR." />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </>
  );
}
