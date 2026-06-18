import './globals.css';
import type { ReactNode } from 'react';
import { Be_Vietnam_Pro, IBM_Plex_Mono } from 'next/font/google';
import { I18nProvider } from './i18n/I18nContext';
import { TopBar } from './TopBar';

const disp = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-disp-src',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-src',
});

export const metadata = { title: 'Sonar' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" data-theme="naval" data-accent="green" className={`${disp.variable} ${mono.variable}`}>
      <head>
        {/*
          Deep-link splash guard. Runs while the <head> is parsed — BEFORE the body
          (and the static HomeScreen) paints. If the page was opened via a connection
          link (#fragment), it flags <html data-joining> so the CSS splash overlay
          covers the home screen until React takes over and shows its own loader.
          page.tsx clears the flag once it's in control.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(location.hash&&location.hash.length>1)document.documentElement.setAttribute('data-joining','')}catch(e){}",
          }}
        />
      </head>
      <body>
        <div id="join-splash" aria-hidden="true">
          <div className="join-splash-spin" />
        </div>
        <I18nProvider>
          {/*
            .app:
              position:absolute; inset:0; display:flex; flex-direction:column;
              align-items:center; color:var(--ink); font-family:var(--font-disp);
              overflow:hidden; -webkit-font-smoothing:antialiased;
              background: 3-layer radial gradients + bg base colour.
            ::after vignette: absolute inset-0; pointer-events:none; z-30;
              box-shadow: inset 0 0 120px rgba(0,0,0,0.55)
          */}
          <div className={[
            'absolute inset-0 flex flex-col items-center',
            'text-ink font-disp overflow-hidden',
            '[background:radial-gradient(120%_80%_at_50%_-10%,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_55%),radial-gradient(90%_60%_at_50%_110%,color-mix(in_srgb,var(--enemy)_7%,transparent),transparent_60%),var(--bg)]',
            'after:content-[""] after:absolute after:inset-0 after:pointer-events-none after:z-30',
            'after:shadow-[inset_0_0_120px_rgba(0,0,0,0.55)]',
            '[-webkit-font-smoothing:antialiased]',
          ].join(' ')}>
            <TopBar />
            {children}
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
