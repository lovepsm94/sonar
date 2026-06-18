# design-sync NOTES — Sonar

Repo-specific gotchas for future syncs. Sonar is a **Next.js app**, not a
published component library, so this sync runs the package shape in a slightly
unusual configuration.

## Setup quirks (how this sync is wired)

- **No dist / no library build.** There is no `main`/`module`/`exports` and no
  component build. We bundle via a hand-written barrel entry
  `.design-sync/lib-entry.tsx` (`cfg.entry`), which re-exports the synced
  components. The barrel's location lets the converter resolve `PKG_DIR` to the
  repo root (its `package.json` has `name: "sonar"`), so `componentSrcMap` paths
  and `cssEntry` resolve correctly. `@/*` alias resolves via `cfg.tsconfig`.
- **CSS.** Tokens + utilities are compiled fresh with the Tailwind CLI into
  `.design-sync/compiled.css` (`cfg.cssEntry`). Regenerate on a re-sync if the
  Tailwind config or any class usage changed:
  `npx tailwindcss -i ./src/app/globals.css -o ./.design-sync/compiled.css`.
- **Theme + i18n provider.** Tokens are scoped under `[data-theme]`/`[data-accent]`,
  and screens read `useI18n`. `.design-sync/preview-root.tsx` (`cfg.provider`,
  merged via `cfg.extraEntries`) supplies both (theme `naval`/accent `green`
  + `I18nProvider`). Without it everything renders unstyled or crashes.
- **Fixtures.** `.design-sync/fixtures.ts` builds real `GameState` objects via the
  game's own `initState` + `generateMap`, tweaked for each scenario. Previews
  import it via `../fixtures`. Not a component, so never a card.

## Excluded / deferred

- **ScanModal is intentionally NOT synced** (`componentSrcMap: {"ScanModal": null}`).
  It mounts a live camera (QR scanner, `@yudiel/react-qr-scanner`) on render and
  cannot be previewed statically — it would flash a webcam feed or hit a
  permission error in the design tool. Re-add only if a camera-less render path
  exists.

## Verification

- **No local Playwright/Chromium.** The automated render check (`package-validate`
  with chromium) was NOT used. Render verification was done through the
  **Playwright MCP browser**: serve `ds-bundle` (`.design-sync/serve8889.mjs`),
  open each `components/**/<Name>.html`, screenshot, grade visually. A future
  sync without the MCP should either install playwright into `.ds-sync` or repeat
  the MCP flow. `package-validate --no-render-check` covers the structural gate.

## Known render warns

- 3 CSS custom properties referenced but not defined (below validate threshold) —
  `--font-disp-src` / `--font-mono-src` (next/font runtime vars, absent here; the
  fonts fall back to IBM Plex Mono / Be Vietnam Pro → system) and one grid-soft
  variant. Cosmetic; safe to ignore.
- `cfg.runtimeFontPrefixes: ["IBM Plex", "Be Vietnam"]` suppresses `[FONT_MISSING]`
  for the brand families (served by the host app's next/font, not shipped here).

## Re-sync risks (watch list)

- **Barrel + componentSrcMap drift.** Adding/removing a screen means editing BOTH
  `.design-sync/lib-entry.tsx` and `cfg.componentSrcMap`. They are not derived.
- **Compiled CSS staleness.** `compiled.css` is a build artifact committed as the
  cssEntry — regenerate it (command above) whenever styling changes, or designs
  render against stale tokens.
- **Provider data.** `preview-root.tsx` pins theme `naval` + accent `green`. If the
  brand default theme changes, update it.
- **Fixtures vs engine.** `fixtures.ts` depends on `initState`/`generateMap` shapes
  staying stable; a `GameState` field rename will break preview compilation.
