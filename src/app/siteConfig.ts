/**
 * Single source of truth for the public site URL.
 *
 * Override at build time with NEXT_PUBLIC_SITE_URL (e.g. on Netlify/Vercel set it
 * to the production domain). Falls back to a sensible default for local builds.
 * The value is inlined at build time — required for `output: 'export'`.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sonar-nine-flame.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Sonar';

export const SITE_DESCRIPTION =
  'Two-player turn-based submarine duel — a simplified Captain Sonar you play peer-to-peer in the browser. No backend, no sign-up: connect by QR code or link and outwit your opponent with sonar, torpedoes, and silent running.';
