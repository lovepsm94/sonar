import type { MetadataRoute } from 'next';
import { SITE_URL } from './siteConfig';

// Statically generated to sitemap.xml at build time (compatible with output: 'export').
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
