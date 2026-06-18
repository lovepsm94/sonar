import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  // Auto-inject the SW registration script into the exported pages.
  register: true,
  // No service worker in dev — avoids stale-cache confusion while iterating.
  disable: process.env.NODE_ENV === 'development',
  // Warm the cache as the user navigates within the SPA.
  cacheOnFrontEndNav: true,
  // When connectivity returns, reload so a newer precached build takes over.
  reloadOnOnline: true,
  workboxOptions: {
    // Single-page static export: every emitted asset is precached at build time
    // (HTML, hashed _next chunks incl. the lazy QR-scanner chunk, self-hosted
    // fonts, favicons, og-image). Old caches are cleaned up per build.
    cleanupOutdatedCaches: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default withPWA(nextConfig);
