'use client';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/app/i18n/I18nContext';

/**
 * Preview wrapper for design-sync cards.
 *
 * The Sonar theme tokens (--accent, --panel, --font-mono, …) are defined in CSS
 * scoped under `[data-theme="naval"]` / `[data-accent="green"]` selectors, so a
 * bare render has no tokens and shows unstyled boxes. This wrapper sets those
 * attributes (tokens then cascade to descendants) and supplies the i18n context
 * the screens read via `useI18n`. It is NOT a Sonar component — it exists only so
 * preview cards render the way the real app shell renders them.
 */
export function PreviewRoot({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <div
        data-theme="naval"
        data-accent="green"
        style={{
          background: 'var(--bg)',
          color: 'var(--ink)',
          fontFamily: 'var(--font-disp)',
          padding: 24,
          minHeight: 140,
        }}
      >
        {children}
      </div>
    </I18nProvider>
  );
}
