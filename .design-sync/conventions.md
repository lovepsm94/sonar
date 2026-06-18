# Sonar UI — build conventions

Sonar is a naval-HUD submarine-duel UI. Components are real React parts exported
on `window.Sonar`. Two setup rules make them render correctly — miss either and
you get unstyled boxes or a crash.

## 1. Always wrap in the themed + i18n root

All color/spacing tokens are CSS variables scoped under `[data-theme]` /
`[data-accent]` attributes — a bare mount has **no tokens** and renders unstyled.
Most screens also read translations via `useI18n`, so they need the i18n
provider. Wrap every Sonar tree once at the top:

```jsx
import { I18nProvider } from '<i18n module>'; // app-side provider

<div data-theme="naval" data-accent="green">   {/* themes: naval | phosphor | abyss · accents: green | cyan | amber */}
  <I18nProvider>
    <HomeScreen onCreate={fn} onJoinCode={fn} />
  </I18nProvider>
</div>
```

Tokens cascade to all descendants, so one wrapping element is enough.

## 2. The styling idiom — Tailwind utilities mapped to theme tokens

Sonar uses Tailwind, but every color/radius/font utility resolves to a theme
**token**, never a raw hex. For your own layout glue, compose with these:

- **Colors** (`bg-*` / `text-* `/ `border-*`): `bg`, `panel`, `panel-2`, `ink`,
  `muted`, `faint`, `line`, `accent`, `accent-deep`, `enemy`, `danger`, `gold`,
  `island`, `island-2`, `scope`, `grid`, `scan`. e.g. `bg-panel text-ink border-line`,
  `text-accent` (friendly/you), `text-enemy` (opponent), `text-danger` (damage),
  `text-gold` (energy/cost).
- **Radius**: `rounded-box` (cards/panels), `rounded-sm2` (buttons/controls).
- **Fonts**: `font-mono` (labels, HUD, codes — the dominant voice), `font-disp`
  (display headings). Body copy uses the display family by default.
- **Motion**: `animate-screen-in`, `animate-pulse`, `animate-sweep-rot`,
  `animate-shake`, `animate-logrow` are defined; prefer them over ad-hoc keyframes.

Mono + uppercase + wide letter-spacing is the house voice for chrome
(`font-mono uppercase tracking-[.14em]`). Keep new surfaces dark: `bg-panel` on
`bg-bg`, hairline `border-line`, accent only for emphasis.

## 3. Where the truth lives

- The bound `styles.css` and its `@import` closure (incl. `_ds_bundle.css`) hold
  every token value and component style — read it before inventing a color.
- Each component's `<Name>.d.ts` is its prop contract; `<Name>.prompt.md` shows
  usage. Screens take a `state: GameState` plus event handlers; the small parts
  (`WaitDots`, `MiniRadar`, `TopBar`) are self-contained.

## 4. Composition note

Screen components (`HomeScreen`, `PlayScreen`, `EndScreen`, …) are full-bleed and
own their layout — drop them in directly. `Board` and the HUD expect a real
`GameState`; build one from the game module's `initState(generateMap(seed), side)`
rather than hand-faking the shape.
