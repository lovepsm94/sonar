import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

/**
 * The 3 themes (naval/phosphor/abyss) + accent live as CSS variables injected via
 * the addBase plugin below, switched via [data-theme]/[data-accent] on <html>.
 * We map those variables into the Tailwind palette so utilities like
 * `bg-bg text-ink border-line text-accent` resolve to the live theme.
 * Do NOT hard-code hex here — keep everything var-driven.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        scope: 'var(--scope)',
        'scope-2': 'var(--scope-2)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        line: 'var(--line)',
        island: 'var(--island)',
        'island-2': 'var(--island-2)',
        enemy: 'var(--enemy)',
        danger: 'var(--danger)',
        gold: 'var(--gold)',
        accent: 'var(--accent)',
        'accent-deep': 'var(--accent-deep)',
        grid: 'var(--grid)',
        scan: 'var(--scan)',
      },
      fontFamily: {
        disp: 'var(--font-disp)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        // named `box`/`sm2` to avoid clashing with Tailwind's `rounded-r` (right side)
        box: 'var(--r)',
        sm2: 'var(--r-sm)',
      },
      screens: {
        // mobile-first defaults; md = tablet, lg = desktop
        md: '768px',
        lg: '1024px',
      },
      keyframes: {
        'screen-in': {
          from: { transform: 'translateY(10px)' },
          to:   { transform: 'none' },
        },
        pulse: {
          '50%': { opacity: '.35' },
        },
        logrow: {
          from: { opacity: '0', transform: 'translateX(-6px)' },
        },
        shake: {
          '10%, 90%':       { transform: 'translateX(-2px)' },
          '20%, 80%':       { transform: 'translateX(4px)' },
          '30%, 50%, 70%':  { transform: 'translateX(-7px)' },
          '40%, 60%':       { transform: 'translateX(7px)' },
        },
        scanline: {
          '0%':   { top: '20px' },
          '50%':  { top: '218px' },
          '100%': { top: '20px' },
        },
        reveal: {
          to: { opacity: '1' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
        },
        // NOTE: the board FX keyframes (fx-torp/fx-burst/fx-flash/fx-ping/
        // fx-silence/fx-surf-ring/fx-bubble + the explosion set) live in
        // src/app/globals.css, not here — they are used as inline `animation:`
        // strings rather than `animate-*` classes, so Tailwind would purge them.
        'sweep-rot': {
          to: { transform: 'rotate(360deg)' },
        },
        'copied-flash': {
          '0%':   { boxShadow: '0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent)' },
          '40%':  { boxShadow: '0 0 16px 1px color-mix(in srgb, var(--accent) 40%, transparent)' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
        'copy-pop': {
          '0%':   { transform: 'scale(.96)' },
          '45%':  { transform: 'scale(1.035)' },
          '100%': { transform: 'scale(1)' },
        },
        'end-glow-in': {
          from: { opacity: '0', transform: 'translate(-50%,-50%) scale(.4)' },
          to:   { opacity: '1', transform: 'translate(-50%,-50%) scale(1)' },
        },
        'end-glow-breathe': {
          '50%': { opacity: '.6', transform: 'translate(-50%,-50%) scale(1.08)' },
        },
        'bubble-rise': {
          '0%':   { transform: 'translateY(0) translateX(0)', opacity: '0' },
          '12%':  { opacity: '.9' },
          '80%':  { opacity: '.7' },
          '100%': { transform: 'translateY(-118vh) translateX(14px)', opacity: '0' },
        },
        'debris-sink': {
          '0%':   { transform: 'translateY(0) rotate(0deg)', opacity: '0' },
          '15%':  { opacity: '.8' },
          '100%': { transform: 'translateY(118vh) rotate(140deg)', opacity: '0' },
        },
        'end-ring': {
          '0%':   { transform: 'scale(.7)', opacity: '.75' },
          '100%': { transform: 'scale(2.9)', opacity: '0' },
        },
        'icon-pop': {
          '0%':   { transform: 'scale(.3) rotate(-12deg)' },
          '60%':  { transform: 'scale(1.12) rotate(3deg)' },
          '100%': { transform: 'scale(1) rotate(0)' },
        },
        'icon-sink': {
          '0%':   { transform: 'translateY(-26px) rotate(-8deg)' },
          '55%':  { transform: 'translateY(2px)' },
          '100%': { transform: 'translateY(0) rotate(0)' },
        },
        'sub-surface': {
          '0%':   { transform: 'scale(.85)' },
          '40%':  { transform: 'scale(1.18)' },
          '70%':  { transform: 'scale(.97)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'screen-in':   'screen-in .45s cubic-bezier(.2,.7,.2,1) both',
        pulse:         'pulse 2s ease-in-out infinite',
        logrow:        'logrow .35s ease both',
        shake:         'shake .5s cubic-bezier(.36,.07,.19,.97) both',
        scanline:      'scanline 1.6s ease-in-out infinite',
        reveal:        'reveal .2s both',
        'sheet-up':    'sheet-up .32s cubic-bezier(.2,.8,.2,1) both',
        'sweep-rot':     'sweep-rot 5.5s linear infinite',
        'copied-flash':  'copied-flash 1.2s ease',
        'copy-pop':      'copy-pop .4s ease',
        'end-glow-in':   'end-glow-in 1s ease-out forwards',
        'end-glow-breathe': 'end-glow-breathe 3.4s ease-in-out infinite',
        'bubble-rise':   'bubble-rise linear infinite',
        'debris-sink':   'debris-sink ease-in infinite',
        'end-ring':      'end-ring 2.4s ease-out infinite',
        'icon-pop':      'icon-pop .7s cubic-bezier(.2,1.4,.4,1) both',
        'icon-sink':     'icon-sink 1.1s cubic-bezier(.4,.1,.3,1) both',
        'sub-surface':   'sub-surface 1.1s cubic-bezier(.3,.9,.3,1) both',
      },
    },
  },
  plugins: [
    plugin(function ({ addBase }) {
      addBase({
        // ── CSS custom properties ──────────────────────────────────────
        ':root': {
          '--r':       '14px',
          '--r-sm':    '9px',
          '--hud-h':   '12px',
          '--font-disp': 'var(--font-disp-src), "Be Vietnam Pro", system-ui, sans-serif',
          '--font-mono': 'var(--font-mono-src), "IBM Plex Mono", ui-monospace, monospace',
        },

        // ── Direction 1 · NAVAL HUD (default) ─────────────────────────
        '[data-theme="naval"]': {
          '--bg':        '#060e18',
          '--panel':     '#0c1826',
          '--panel-2':   '#112335',
          '--scope':     '#06141a',
          '--scope-2':   '#08191f',
          '--grid':      'rgba(61, 220, 132, 0.20)',
          '--grid-soft': 'rgba(61, 220, 132, 0.07)',
          '--sector-ln': 'rgba(120, 200, 255, 0.28)',
          '--ink':       '#e7f3ef',
          '--muted':     '#6f8aa0',
          '--faint':     'rgba(120, 160, 190, 0.16)',
          '--line':      'rgba(120, 170, 210, 0.13)',
          '--island':    '#1b3145',
          '--island-2':  '#24435c',
          '--enemy':     '#4cc4ff',
          '--danger':    '#ff5d5d',
          '--gold':      '#ffcf6b',
          '--scan':      'rgba(61, 220, 132, 0.55)',
        },

        // ── Direction 2 · DEEP PHOSPHOR (CRT mono) ────────────────────
        '[data-theme="phosphor"]': {
          '--bg':        '#020806',
          '--panel':     '#05120c',
          '--panel-2':   '#07190f',
          '--scope':     '#021109',
          '--scope-2':   '#03160c',
          '--grid':      'rgba(70, 240, 150, 0.26)',
          '--grid-soft': 'rgba(70, 240, 150, 0.08)',
          '--sector-ln': 'rgba(70, 240, 150, 0.42)',
          '--ink':       '#b9ffd9',
          '--muted':     '#4f9b73',
          '--faint':     'rgba(70, 240, 150, 0.12)',
          '--line':      'rgba(70, 240, 150, 0.16)',
          '--island':    '#0c2417',
          '--island-2':  '#11321f',
          '--enemy':     '#7df0b0',
          '--danger':    '#ff7a5d',
          '--gold':      '#d6ff8a',
          '--scan':      'rgba(90, 255, 165, 0.6)',
        },

        // ── Direction 3 · COLD ABYSS (slate + ice) ────────────────────
        '[data-theme="abyss"]': {
          '--bg':        '#0a0f15',
          '--panel':     '#11171f',
          '--panel-2':   '#18212c',
          '--scope':     '#0b1219',
          '--scope-2':   '#0d161f',
          '--grid':      'rgba(120, 200, 230, 0.16)',
          '--grid-soft': 'rgba(120, 200, 230, 0.06)',
          '--sector-ln': 'rgba(150, 210, 240, 0.3)',
          '--ink':       '#eaf2f8',
          '--muted':     '#7d909f',
          '--faint':     'rgba(150, 190, 215, 0.12)',
          '--line':      'rgba(150, 190, 215, 0.12)',
          '--island':    '#1c2836',
          '--island-2':  '#283747',
          '--enemy':     '#8be0ff',
          '--danger':    '#ff6470',
          '--gold':      '#ffd98a',
          '--scan':      'rgba(120, 220, 235, 0.5)',
        },

        // ── Accent overrides ───────────────────────────────────────────
        '[data-accent="green"]': { '--accent': '#3ddc84', '--accent-deep': '#1f8a5b' },
        '[data-accent="cyan"]':  { '--accent': '#38d9ff', '--accent-deep': '#1f7fa8' },
        '[data-accent="amber"]': { '--accent': '#ffc24b', '--accent-deep': '#b9822a' },

        // ── Resets ─────────────────────────────────────────────────────
        'html, body': { margin: '0', height: '100%', background: 'var(--bg)' },

        // ── Box-sizing reset ──────────────────────────────────────────
        '*': { boxSizing: 'border-box' },

        // ── Phosphor scanlines (theme-scoped pseudo — cannot be a utility) ──
        // This rule is kept here because `[data-theme="phosphor"] .scope-skin::before`
        // requires a theme-ancestor selector combined with a pseudo-element, which
        // cannot be expressed as a single Tailwind utility class.
        '[data-theme="phosphor"] .scope-skin::before': {
          content: '""',
          position: 'absolute',
          inset: '0',
          pointerEvents: 'none',
          zIndex: '6',
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px)',
          mixBlendMode: 'multiply',
          borderRadius: 'inherit',
        },

        // Hide the global topbar while in a match so the play screen can reclaim the top space.
        'html[data-ingame="1"] .app-topbar': { display: 'none' },
      });
    }),
  ],
};

export default config;
