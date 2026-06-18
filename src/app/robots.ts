import type { MetadataRoute } from 'next';
import { SITE_URL } from './siteConfig';

// Statically generated to robots.txt at build time (compatible with output: 'export').
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
