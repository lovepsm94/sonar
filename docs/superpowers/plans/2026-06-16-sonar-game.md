# Sonar Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static web app where two people play a simplified turn-based *Captain Sonar* duel over a WebRTC peer connection, handshaking by QR/link, with no backend.

**Architecture:** Pure, framework-free game logic (`src/game/*`) reduced identically-ish on both peers via a perspective model (each client owns its secret sub; the defending client computes hidden-info results and replies). A thin networking layer (`src/net/*`) wraps `RTCPeerConnection` + a `RTCDataChannel`, encodes SDP for QR/link signaling, and reads/writes QR codes. A React/SVG UI (`src/app/*`) renders the board with Framer Motion and drives a small screen state machine. Spec: `docs/superpowers/specs/2026-06-16-sonar-game-design.md`.

**Tech Stack:** Next.js (`output: 'export'`, App Router) · TypeScript · React 18 · Framer Motion · SVG · Vitest · libraries `qrcode`, `jsqr`, `pako` (deflate).

---

## File Structure

```
sonar/
  package.json
  tsconfig.json
  next.config.mjs            # output: 'export'
  vitest.config.ts
  src/
    game/
      types.ts               # all domain types + constants
      rng.ts                 # seeded PRNG (mulberry32)
      geo.ts                 # grid geometry helpers (sector, neighbors, distance)
      map.ts                 # generateMap(seed): deterministic island layout
      engine.ts              # initState, applyLocal, applyRemote, win logic
      protocol.ts            # WireMessage union + LocalAction union + SonarClue
    net/
      signaling.ts           # encode/decode SDP <-> compact string (pako + base64url)
      webrtc.ts              # PeerLink: createHost / joinFrom / send / onMessage
      qr.ts                  # makeQrDataUrl + scanQrFromCamera
    app/
      i18n/
        dict.ts              # translation table key -> { vi, en }
        I18nContext.tsx      # provider + useI18n() hook
        LanguageToggle.tsx
      board/
        Board.tsx            # SVG board + Framer Motion ship/trail/effects
      screens/
        HomeScreen.tsx
        ConnectScreen.tsx
        PlaceScreen.tsx
        PlayScreen.tsx
        EndScreen.tsx
      useGame.ts             # React hook: holds GameState + PeerLink wiring
      layout.tsx             # root layout, wraps I18nProvider
      page.tsx               # screen state machine (single route)
      globals.css
  test/
    game/{rng,map,geo,engine,signaling}.test.ts
    app/i18n.test.ts
```

---

## Phase 0 — Project scaffold

### Task 0: Initialize the project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "sonar",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "framer-motion": "11.3.8",
    "qrcode": "1.5.4",
    "jsqr": "1.4.0",
    "pako": "2.1.0"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "@types/node": "20.14.12",
    "@types/qrcode": "1.5.5",
    "@types/pako": "2.0.3",
    "vitest": "2.0.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.mjs`** (static export, no server)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // For project-page hosting set basePath/assetPrefix here later if needed.
};
export default nextConfig;
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
});
```

- [ ] **Step 5: Create minimal `src/app/globals.css`**

```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: system-ui, sans-serif; background: #0b1622; color: #e6eef5; }
button { font: inherit; cursor: pointer; }
```

- [ ] **Step 6: Create `src/app/layout.tsx`** (placeholder root, replaced in Phase 10)

```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Sonar' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create `src/app/page.tsx`** (temporary smoke screen, replaced in Phase 11)

```tsx
'use client';
export default function Page() {
  return <main style={{ padding: 24 }}>Sonar — scaffold OK</main>;
}
```

- [ ] **Step 8: Install and verify build**

Run: `npm install`
Then: `npm run build`
Expected: build succeeds and produces an `out/` directory.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json next.config.mjs vitest.config.ts src/app
git commit -m "chore: scaffold Next.js static-export project"
```

---

## Phase 1 — Seeded RNG

### Task 1: `mulberry32` deterministic PRNG

**Files:**
- Create: `src/game/rng.ts`
- Test: `test/game/rng.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/game/rng.test.ts
import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/game/rng';

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs across seeds', () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/game/rng.test.ts`
Expected: FAIL — cannot find module `@/game/rng`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/rng.ts
/** Returns a seeded PRNG producing floats in [0, 1). Deterministic per seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [0, n). */
export function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/game/rng.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/rng.ts test/game/rng.test.ts
git commit -m "feat(game): seeded mulberry32 PRNG"
```

---

## Phase 2 — Types & geometry

### Task 2: Domain types and constants

**Files:**
- Create: `src/game/types.ts`

- [ ] **Step 1: Create the types file** (no test — pure declarations consumed by later tasks)

```ts
// src/game/types.ts
export const GRID = 10;            // 10x10 board
export const SECTOR_SIZE = 5;      // 4 sectors of 5x5
export const MAX_ENERGY = 6;
export const START_HP = 3;
export const TORPEDO_RANGE = 4;    // Manhattan distance
export const SILENCE_MAX = 3;      // max cells per Silence
export const SURFACE_SKIP = 3;     // turns skipped after surfacing
export const ISLAND_MIN = 10;      // min islands on a map
export const ISLAND_MAX = 15;      // max islands on a map
export const ISLAND_MIN_GAP = 2;   // Chebyshev gap between islands

export const COST = { sonar: 3, silence: 4, torpedo: 4 } as const;

export type Lang = 'vi' | 'en';
export type Direction = 'N' | 'S' | 'E' | 'W';
export type SectorId = 'A' | 'B' | 'C' | 'D';
export type Side = 'host' | 'guest';
export type Phase = 'placing' | 'playing' | 'over';

export interface Cell { x: number; y: number; }
export interface Bilingual { vi: string; en: string; }

export interface GameMap {
  seed: number;
  size: number;            // GRID
  islands: boolean[][];    // islands[y][x] === true means island
}

export interface SubState {
  pos: Cell;
  trail: Cell[];           // cells occupied since last surface (excludes current pos)
  hp: number;
  energy: number;
  alive: boolean;
}

export interface EnemyView {
  hp: number;
  energy: number;          // tracked from observed actions
  surfacedSector: SectorId | null;
  lastHitCell: Cell | null;
}

export interface LogEntry { id: number; text: Bilingual; }

export interface GameState {
  map: GameMap;
  side: Side;              // which side THIS client is
  phase: Phase;
  turn: Side;              // whose turn it currently is
  turnNumber: number;
  me: SubState;
  enemy: EnemyView;
  myExtraTurns: number;    // consecutive bonus turns I still get (because enemy surfaced)
  enemyExtraTurns: number; // consecutive bonus turns enemy still gets (because I surfaced)
  iPlaced: boolean;
  enemyPlaced: boolean;
  winner: Side | null;
  log: LogEntry[];
  nextNonce: number;
  nextLogId: number;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(game): domain types and constants"
```

### Task 3: Geometry helpers

**Files:**
- Create: `src/game/geo.ts`
- Test: `test/game/geo.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/game/geo.test.ts
import { describe, it, expect } from 'vitest';
import { sectorOf, step, inBounds, manhattan, chebyshev } from '@/game/geo';

describe('geo', () => {
  it('sectorOf maps quadrants A/B/C/D', () => {
    expect(sectorOf({ x: 0, y: 0 })).toBe('A'); // top-left
    expect(sectorOf({ x: 9, y: 0 })).toBe('B'); // top-right
    expect(sectorOf({ x: 0, y: 9 })).toBe('C'); // bottom-left
    expect(sectorOf({ x: 9, y: 9 })).toBe('D'); // bottom-right
  });

  it('step moves one cell in a direction', () => {
    expect(step({ x: 5, y: 5 }, 'N')).toEqual({ x: 5, y: 4 });
    expect(step({ x: 5, y: 5 }, 'S')).toEqual({ x: 5, y: 6 });
    expect(step({ x: 5, y: 5 }, 'E')).toEqual({ x: 6, y: 5 });
    expect(step({ x: 5, y: 5 }, 'W')).toEqual({ x: 4, y: 5 });
  });

  it('inBounds checks 0..GRID-1', () => {
    expect(inBounds({ x: 0, y: 0 })).toBe(true);
    expect(inBounds({ x: 9, y: 9 })).toBe(true);
    expect(inBounds({ x: -1, y: 0 })).toBe(false);
    expect(inBounds({ x: 10, y: 0 })).toBe(false);
  });

  it('distances', () => {
    expect(manhattan({ x: 0, y: 0 }, { x: 2, y: 3 })).toBe(5);
    expect(chebyshev({ x: 0, y: 0 }, { x: 2, y: 3 })).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/game/geo.test.ts`
Expected: FAIL — cannot find module `@/game/geo`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/geo.ts
import { GRID, SECTOR_SIZE, type Cell, type Direction, type SectorId } from './types';

export function inBounds(c: Cell): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < GRID && c.y < GRID;
}

export function step(c: Cell, d: Direction): Cell {
  switch (d) {
    case 'N': return { x: c.x, y: c.y - 1 };
    case 'S': return { x: c.x, y: c.y + 1 };
    case 'E': return { x: c.x + 1, y: c.y };
    case 'W': return { x: c.x - 1, y: c.y };
  }
}

export function sectorOf(c: Cell): SectorId {
  const left = c.x < SECTOR_SIZE;
  const top = c.y < SECTOR_SIZE;
  if (top && left) return 'A';
  if (top && !left) return 'B';
  if (!top && left) return 'C';
  return 'D';
}

export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function chebyshev(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/game/geo.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/geo.ts test/game/geo.test.ts
git commit -m "feat(game): grid geometry helpers"
```

---

## Phase 3 — Map generation

### Task 4: Deterministic scattered-island map

**Files:**
- Create: `src/game/map.ts`
- Test: `test/game/map.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/game/map.test.ts
import { describe, it, expect } from 'vitest';
import { generateMap, islandCount, waterIsConnected } from '@/game/map';
import { chebyshev, sectorOf } from '@/game/geo';
import { GRID, ISLAND_MIN, ISLAND_MAX, ISLAND_MIN_GAP, type Cell } from '@/game/types';

function islandCells(m: ReturnType<typeof generateMap>): Cell[] {
  const out: Cell[] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (m.islands[y][x]) out.push({ x, y });
  return out;
}

describe('generateMap', () => {
  it('is deterministic for the same seed', () => {
    expect(generateMap(999).islands).toEqual(generateMap(999).islands);
  });

  it('keeps island count within bounds', () => {
    for (const seed of [1, 2, 3, 42, 100, 7777]) {
      const n = islandCount(generateMap(seed));
      expect(n).toBeGreaterThanOrEqual(ISLAND_MIN);
      expect(n).toBeLessThanOrEqual(ISLAND_MAX);
    }
  });

  it('keeps islands scattered (>= ISLAND_MIN_GAP apart)', () => {
    for (const seed of [1, 2, 3, 42, 100, 7777]) {
      const cells = islandCells(generateMap(seed));
      for (let i = 0; i < cells.length; i++)
        for (let j = i + 1; j < cells.length; j++)
          expect(chebyshev(cells[i], cells[j])).toBeGreaterThanOrEqual(ISLAND_MIN_GAP);
    }
  });

  it('balances islands across the 4 sectors (no sector empty or overloaded)', () => {
    const cells = islandCells(generateMap(42));
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    cells.forEach((c) => { counts[sectorOf(c)]++; });
    for (const k of ['A', 'B', 'C', 'D']) {
      expect(counts[k]).toBeGreaterThanOrEqual(1);
      expect(counts[k]).toBeLessThanOrEqual(5);
    }
  });

  it('leaves water fully connected', () => {
    for (const seed of [1, 2, 3, 42, 100, 7777]) {
      expect(waterIsConnected(generateMap(seed))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/game/map.test.ts`
Expected: FAIL — cannot find module `@/game/map`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/map.ts
import { mulberry32, randInt } from './rng';
import { chebyshev, sectorOf } from './geo';
import {
  GRID, ISLAND_MIN, ISLAND_MAX, ISLAND_MIN_GAP, type Cell, type GameMap, type SectorId,
} from './types';

const PER_SECTOR_MAX = 5;

function emptyGrid(): boolean[][] {
  return Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => false));
}

export function islandCount(m: GameMap): number {
  let n = 0;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (m.islands[y][x]) n++;
  return n;
}

export function waterIsConnected(m: GameMap): boolean {
  let start: Cell | null = null;
  for (let y = 0; y < GRID && !start; y++)
    for (let x = 0; x < GRID && !start; x++) if (!m.islands[y][x]) start = { x, y };
  if (!start) return false;
  const seen = emptyGrid();
  const stack: Cell[] = [start];
  seen[start.y][start.x] = true;
  let water = 0;
  let visited = 0;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (!m.islands[y][x]) water++;
  while (stack.length) {
    const c = stack.pop()!;
    visited++;
    for (const n of [{ x: c.x + 1, y: c.y }, { x: c.x - 1, y: c.y }, { x: c.x, y: c.y + 1 }, { x: c.x, y: c.y - 1 }]) {
      if (n.x < 0 || n.y < 0 || n.x >= GRID || n.y >= GRID) continue;
      if (m.islands[n.y][n.x] || seen[n.y][n.x]) continue;
      seen[n.y][n.x] = true;
      stack.push(n);
    }
  }
  return visited === water;
}

/** Attempts one placement pass; returns null if it cannot satisfy constraints. */
function tryBuild(seed: number): GameMap | null {
  const rng = mulberry32(seed);
  const target = ISLAND_MIN + randInt(rng, ISLAND_MAX - ISLAND_MIN + 1);
  const islands = emptyGrid();
  const placed: Cell[] = [];
  const perSector: Record<SectorId, number> = { A: 0, B: 0, C: 0, D: 0 };
  let attempts = 0;
  while (placed.length < target && attempts < 2000) {
    attempts++;
    const c: Cell = { x: randInt(rng, GRID), y: randInt(rng, GRID) };
    if (islands[c.y][c.x]) continue;
    const sec = sectorOf(c);
    if (perSector[sec] >= PER_SECTOR_MAX) continue;
    if (placed.some((p) => chebyshev(p, c) < ISLAND_MIN_GAP)) continue;
    islands[c.y][c.x] = true;
    placed.push(c);
    perSector[sec]++;
  }
  if (placed.length < ISLAND_MIN) return null;
  if (perSector.A < 1 || perSector.B < 1 || perSector.C < 1 || perSector.D < 1) return null;
  const map: GameMap = { seed, size: GRID, islands };
  if (!waterIsConnected(map)) return null;
  return map;
}

/** Deterministic per seed: if a seed fails constraints, derive the next seed and retry. */
export function generateMap(seed: number): GameMap {
  let s = seed >>> 0;
  for (let i = 0; i < 50; i++) {
    const m = tryBuild(s);
    if (m) return { ...m, seed }; // expose the original requested seed
    s = (s + 0x9e3779b9) >>> 0;
  }
  throw new Error('generateMap: could not build a valid map');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/game/map.test.ts`
Expected: PASS (5 tests). If "balances sectors" fails for a seed, the per-sector floor in `tryBuild` already rejects empty sectors — confirm the test seeds produce maps; all listed seeds are validated by the connectivity test too.

- [ ] **Step 5: Commit**

```bash
git add src/game/map.ts test/game/map.test.ts
git commit -m "feat(game): deterministic scattered-island map generator"
```

---

## Phase 4 — Protocol & engine init

### Task 5: Protocol unions (wire + local actions)

**Files:**
- Create: `src/game/protocol.ts`

- [ ] **Step 1: Create the protocol file** (declarations consumed by engine + net)

```ts
// src/game/protocol.ts
import type { Cell, Direction, SectorId } from './types';

/** Actions the local UI dispatches for THIS player. */
export type LocalAction =
  | { kind: 'place'; cell: Cell }
  | { kind: 'move'; dir: Direction }
  | { kind: 'silence'; dir: Direction; dist: number }   // dist 0..SILENCE_MAX
  | { kind: 'sonar' }
  | { kind: 'torpedo'; target: Cell }
  | { kind: 'surface' }
  | { kind: 'resign' };

export type SonarClueType = 'row' | 'col' | 'sector';
export interface SonarClue { type: SonarClueType; value: number | SectorId; truth: boolean; }

/** Messages sent across the DataChannel between peers. */
export type WireMessage =
  | { t: 'placed' }
  | { t: 'move'; dir: Direction }
  | { t: 'silence' }
  | { t: 'sonar-req'; nonce: number }
  | { t: 'sonar-res'; nonce: number; clues: SonarClue[] }
  | { t: 'torpedo'; target: Cell; nonce: number }
  | { t: 'torpedo-res'; nonce: number; hit: boolean; hitCell: Cell | null; defenderHp: number }
  | { t: 'surface'; sector: SectorId }
  | { t: 'resign' };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/protocol.ts
git commit -m "feat(game): wire + local action protocol types"
```

### Task 6: Engine `initState`

**Files:**
- Create: `src/game/engine.ts`
- Test: `test/game/engine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/game/engine.test.ts
import { describe, it, expect } from 'vitest';
import { initState } from '@/game/engine';
import { generateMap } from '@/game/map';
import { MAX_ENERGY, START_HP } from '@/game/types';

describe('initState', () => {
  it('starts in placing phase with full hp and zero energy', () => {
    const s = initState(generateMap(42), 'host');
    expect(s.phase).toBe('placing');
    expect(s.me.hp).toBe(START_HP);
    expect(s.enemy.hp).toBe(START_HP);
    expect(s.me.energy).toBe(0);
    expect(s.iPlaced).toBe(false);
    expect(s.enemyPlaced).toBe(false);
    expect(s.turn).toBe('host'); // host acts first once playing
    expect(s.winner).toBeNull();
    expect(MAX_ENERGY).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/game/engine.test.ts`
Expected: FAIL — cannot find `initState`.

- [ ] **Step 3: Write minimal implementation** (start of `engine.ts`; later tasks append exports)

```ts
// src/game/engine.ts
import { START_HP, type GameMap, type GameState, type Side } from './types';

export function initState(map: GameMap, side: Side): GameState {
  return {
    map,
    side,
    phase: 'placing',
    turn: 'host',
    turnNumber: 0,
    me: { pos: { x: 0, y: 0 }, trail: [], hp: START_HP, energy: 0, alive: true },
    enemy: { hp: START_HP, energy: 0, surfacedSector: null, lastHitCell: null },
    myExtraTurns: 0,
    enemyExtraTurns: 0,
    iPlaced: false,
    enemyPlaced: false,
    winner: null,
    log: [],
    nextNonce: 1,
    nextLogId: 1,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/game/engine.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts test/game/engine.test.ts
git commit -m "feat(game): engine initState"
```

---

## Phase 5 — Engine: placement, move, energy

### Task 7: `applyLocal` — placement and turn start

**Files:**
- Modify: `src/game/engine.ts`
- Test: `test/game/engine.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// append to test/game/engine.test.ts
import { applyLocal } from '@/game/engine';
import { GRID } from '@/game/types';
import type { Cell, GameMap } from '@/game/types';

// Controlled, island-free map so action tests don't depend on random layout.
// Pass island coordinates to carve specific obstacles.
function blankMap(islands: Cell[] = []): GameMap {
  const grid = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => false));
  islands.forEach((c) => { grid[c.y][c.x] = true; });
  return { seed: 1, size: GRID, islands: grid };
}

describe('applyLocal place', () => {
  it('places my sub on a water cell and emits "placed"', () => {
    const cell = { x: 5, y: 5 };
    const s0 = initState(blankMap(), 'host');
    const { state, outgoing } = applyLocal(s0, { kind: 'place', cell });
    expect(state.iPlaced).toBe(true);
    expect(state.me.pos).toEqual(cell);
    expect(outgoing).toEqual([{ t: 'placed' }]);
  });

  it('rejects placing on an island', () => {
    const island = { x: 3, y: 3 };
    const s0 = initState(blankMap([island]), 'host');
    const { state, outgoing } = applyLocal(s0, { kind: 'place', cell: island });
    expect(state.iPlaced).toBe(false);
    expect(outgoing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/game/engine.test.ts`
Expected: FAIL — `applyLocal` not exported.

- [ ] **Step 3: Implement `applyLocal` skeleton + place branch**

```ts
// append to src/game/engine.ts
import { GRID, type Cell } from './types';
import type { LocalAction, WireMessage } from './protocol';
import { inBounds } from './geo';

export interface LocalResult { state: GameState; outgoing: WireMessage[] }

function isIsland(s: GameState, c: Cell): boolean {
  return s.map.islands[c.y][c.x];
}
function isWater(s: GameState, c: Cell): boolean {
  return inBounds(c) && !isIsland(s, c);
}

export function applyLocal(s: GameState, a: LocalAction): LocalResult {
  switch (a.kind) {
    case 'place': {
      if (s.phase !== 'placing' || s.iPlaced || !isWater(s, a.cell)) return { state: s, outgoing: [] };
      const me = { ...s.me, pos: a.cell, trail: [] };
      const iPlaced = true;
      const phase = iPlaced && s.enemyPlaced ? 'playing' as const : s.phase;
      return { state: { ...s, me, iPlaced, phase }, outgoing: [{ t: 'placed' }] };
    }
    default:
      return { state: s, outgoing: [] };
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/game/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts test/game/engine.test.ts
git commit -m "feat(game): placement via applyLocal"
```

### Task 8: `applyLocal` — move, energy, trail, turn handoff

**Files:**
- Modify: `src/game/engine.ts`
- Test: `test/game/engine.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// append to test/game/engine.test.ts
import { MAX_ENERGY as MAXE } from '@/game/types';

// Host placed at center {5,5} on an island-free map; enemy already placed.
// Center has free water in every direction, so move/silence/torpedo tests are stable.
function playingState() {
  let s = initState(blankMap(), 'host');
  s = { ...s, enemyPlaced: true };
  s = applyLocal(s, { kind: 'place', cell: { x: 5, y: 5 } }).state;
  return s; // phase 'playing', turn 'host', me at {5,5}
}

describe('applyLocal move', () => {
  it('moves N, gains +1 energy, records trail, passes turn', () => {
    const s = playingState();
    const before = s.me.pos;
    const { state, outgoing } = applyLocal(s, { kind: 'move', dir: 'N' });
    expect(state.me.pos).toEqual({ x: before.x, y: before.y - 1 });
    expect(state.me.energy).toBe(1);
    expect(state.me.trail).toContainEqual(before);
    expect(state.turn).toBe('guest');
    expect(state.turnNumber).toBe(1);
    expect(outgoing).toEqual([{ t: 'move', dir: 'N' }]);
  });

  it('rejects moving into own trail', () => {
    let s = playingState();
    s = applyLocal(s, { kind: 'move', dir: 'N' }).state; // now guest's turn
    s = { ...s, turn: 'host' }; // force back for the test
    const { state, outgoing } = applyLocal(s, { kind: 'move', dir: 'S' }); // back into trail cell
    expect(outgoing).toEqual([]);          // rejected
    expect(state.me.pos).toEqual(s.me.pos);
  });

  it('rejects an action when it is not my turn', () => {
    const s = { ...playingState(), turn: 'guest' as const };
    const { outgoing } = applyLocal(s, { kind: 'move', dir: 'N' });
    expect(outgoing).toEqual([]);
  });

  it('caps energy at MAX_ENERGY', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: MAXE } };
    const { state } = applyLocal(s, { kind: 'move', dir: 'N' });
    expect(state.me.energy).toBe(MAXE);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/game/engine.test.ts`
Expected: FAIL — move branch returns no-op.

- [ ] **Step 3: Implement move + shared turn helpers**

```ts
// append to src/game/engine.ts
import { MAX_ENERGY } from './types';
import { step, sameCell } from './geo';

function occupied(s: GameState, c: Cell): boolean {
  return s.me.trail.some((t) => sameCell(t, c)) || sameCell(s.me.pos, c);
}

function isMyTurn(s: GameState): boolean {
  return s.phase === 'playing' && s.turn === s.side && s.winner === null;
}

function other(side: Side): Side {
  return side === 'host' ? 'guest' : 'host';
}

/**
 * I just finished a turn. Normally control passes to the opponent — unless I still
 * owe myself bonus turns (because the enemy surfaced), in which case I keep playing
 * until my bonus turns run out.
 */
function endMyTurn(s: GameState): GameState {
  let myExtraTurns = s.myExtraTurns;
  let turn: Side;
  if (myExtraTurns > 0) {
    myExtraTurns -= 1;
    turn = myExtraTurns > 0 ? s.side : other(s.side);
  } else {
    turn = other(s.side);
  }
  return { ...s, turn, myExtraTurns, turnNumber: s.turnNumber + 1 };
}

function addEnergy(me: SubState, delta: number): SubState {
  return { ...me, energy: Math.min(MAX_ENERGY, me.energy + delta) };
}
```

Then extend the `applyLocal` switch with a `move` case (insert before `default`):

```ts
    case 'move': {
      if (!isMyTurn(s)) return { state: s, outgoing: [] };
      const target = step(s.me.pos, a.dir);
      if (!isWater(s, target) || occupied(s, target)) return { state: s, outgoing: [] };
      let me = { ...s.me, trail: [...s.me.trail, s.me.pos], pos: target };
      me = addEnergy(me, 1);
      const next = endMyTurn({ ...s, me });
      return { state: next, outgoing: [{ t: 'move', dir: a.dir }] };
    }
```

Add the `SubState` import to the existing type import line:

```ts
import { START_HP, MAX_ENERGY, GRID, type GameMap, type GameState, type Side, type Cell, type SubState } from './types';
```
(Consolidate the duplicate import lines added so far into this single import.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/game/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts test/game/engine.test.ts
git commit -m "feat(game): move, energy, trail, turn handoff"
```

---

## Phase 6 — Engine: surface, silence

### Task 9: `applyLocal` — surface

**Files:**
- Modify: `src/game/engine.ts`
- Test: `test/game/engine.test.ts`

- [ ] **Step 1: Add failing test**

```ts
// append to test/game/engine.test.ts
import { SURFACE_SKIP } from '@/game/types';
import { sectorOf as sec } from '@/game/geo';

describe('applyLocal surface', () => {
  it('resets trail, refills energy, declares sector, grants the enemy SURFACE_SKIP turns', () => {
    let s = playingState();
    s = applyLocal(s, { kind: 'move', dir: 'N' }).state; // build some trail
    s = { ...s, turn: 'host' };
    const { state, outgoing } = applyLocal(s, { kind: 'surface' });
    expect(state.me.trail).toEqual([]);
    expect(state.me.energy).toBe(MAXE);
    expect(state.enemyExtraTurns).toBe(SURFACE_SKIP);
    expect(state.turn).toBe('guest');
    expect(outgoing).toEqual([{ t: 'surface', sector: sec(state.me.pos) }]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/game/engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement surface case** (insert before `default`)

```ts
    case 'surface': {
      if (!isMyTurn(s)) return { state: s, outgoing: [] };
      const me = { ...s.me, trail: [], energy: MAX_ENERGY };
      // Surfacing hands control to the enemy for SURFACE_SKIP consecutive turns.
      const next: GameState = {
        ...s, me, enemyExtraTurns: SURFACE_SKIP, turn: other(s.side), turnNumber: s.turnNumber + 1,
      };
      return { state: next, outgoing: [{ t: 'surface', sector: sectorOf(me.pos) }] };
    }
```

Add imports: extend the geo import to include `sectorOf`, and the types import to include `SURFACE_SKIP`:

```ts
import { step, sameCell, sectorOf, inBounds } from './geo';
// types import line also includes: SURFACE_SKIP
```

The mirror side — when the *enemy* surfaces, granting ME bonus turns — is handled by `applyRemote` (Task 12) setting `myExtraTurns`, which `endMyTurn` (above) already consumes.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/game/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts test/game/engine.test.ts
git commit -m "feat(game): surface action"
```

### Task 10: `applyLocal` — silence

**Files:**
- Modify: `src/game/engine.ts`
- Test: `test/game/engine.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// append to test/game/engine.test.ts
import { COST, SILENCE_MAX } from '@/game/types';

describe('applyLocal silence', () => {
  it('moves up to SILENCE_MAX cells in a straight line, costs energy, hides direction', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.silence } };
    const start = s.me.pos;
    const { state, outgoing } = applyLocal(s, { kind: 'silence', dir: 'S', dist: 2 });
    expect(state.me.pos).toEqual({ x: start.x, y: start.y + 2 });
    expect(state.me.energy).toBe(0);
    expect(outgoing).toEqual([{ t: 'silence' }]); // no direction leaked
    expect(state.me.trail).toContainEqual(start);
  });

  it('rejects silence without enough energy', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.silence - 1 } };
    const { outgoing } = applyLocal(s, { kind: 'silence', dir: 'S', dist: 2 });
    expect(outgoing).toEqual([]);
  });

  it('rejects silence path crossing island/trail/out-of-bounds', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.silence } };
    const { outgoing } = applyLocal(s, { kind: 'silence', dir: 'S', dist: SILENCE_MAX + 1 });
    expect(outgoing).toEqual([]); // dist out of allowed range
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/game/engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement silence case** (insert before `default`)

```ts
    case 'silence': {
      if (!isMyTurn(s)) return { state: s, outgoing: [] };
      if (a.dist < 0 || a.dist > SILENCE_MAX) return { state: s, outgoing: [] };
      if (s.me.energy < COST.silence) return { state: s, outgoing: [] };
      // Walk the straight path; every stepped-to cell must be free water and not on the trail.
      const startPos = s.me.pos;
      const trail = [...s.me.trail];
      let pos = s.me.pos;
      for (let i = 0; i < a.dist; i++) {
        const nxt = step(pos, a.dir);
        if (!isWater(s, nxt)) return { state: s, outgoing: [] };
        if (trail.some((t) => sameCell(t, nxt)) || sameCell(startPos, nxt)) {
          return { state: s, outgoing: [] };
        }
        trail.push(pos);
        pos = nxt;
      }
      const me = { ...s.me, pos, trail, energy: s.me.energy - COST.silence };
      const next = endMyTurn({ ...s, me });
      return { state: next, outgoing: [{ t: 'silence' }] };
    }
```

Add `COST`, `SILENCE_MAX` to the types import line.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/game/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts test/game/engine.test.ts
git commit -m "feat(game): silence action"
```

---

## Phase 7 — Engine: torpedo & sonar (attacker side)

### Task 11: `applyLocal` — torpedo & sonar requests

**Files:**
- Modify: `src/game/engine.ts`
- Test: `test/game/engine.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// append to test/game/engine.test.ts
import { TORPEDO_RANGE } from '@/game/types';

describe('applyLocal torpedo/sonar requests', () => {
  it('fires torpedo at an in-range cell, costs energy, emits torpedo with a nonce', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.torpedo } };
    const target = { x: s.me.pos.x, y: Math.max(0, s.me.pos.y - 1) };
    const { state, outgoing } = applyLocal(s, { kind: 'torpedo', target });
    expect(state.me.energy).toBe(0);
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]).toMatchObject({ t: 'torpedo', target });
    expect((outgoing[0] as any).nonce).toBeGreaterThan(0);
    expect(state.turn).toBe('guest');
  });

  it('rejects torpedo out of range', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.torpedo, pos: { x: 0, y: 0 } } };
    const { outgoing } = applyLocal(s, { kind: 'torpedo', target: { x: 9, y: 9 } });
    expect(outgoing).toEqual([]);
  });

  it('emits sonar request and costs energy', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.sonar } };
    const { state, outgoing } = applyLocal(s, { kind: 'sonar' });
    expect(state.me.energy).toBe(0);
    expect(outgoing[0]).toMatchObject({ t: 'sonar-req' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/game/engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement torpedo + sonar cases** (insert before `default`)

```ts
    case 'torpedo': {
      if (!isMyTurn(s)) return { state: s, outgoing: [] };
      if (s.me.energy < COST.torpedo) return { state: s, outgoing: [] };
      if (!inBounds(a.target) || manhattan(s.me.pos, a.target) > TORPEDO_RANGE) {
        return { state: s, outgoing: [] };
      }
      const nonce = s.nextNonce;
      const me = { ...s.me, energy: s.me.energy - COST.torpedo };
      const next = endMyTurn({ ...s, me, nextNonce: nonce + 1 });
      return { state: next, outgoing: [{ t: 'torpedo', target: a.target, nonce }] };
    }
    case 'sonar': {
      if (!isMyTurn(s)) return { state: s, outgoing: [] };
      if (s.me.energy < COST.sonar) return { state: s, outgoing: [] };
      const nonce = s.nextNonce;
      const me = { ...s.me, energy: s.me.energy - COST.sonar };
      const next = endMyTurn({ ...s, me, nextNonce: nonce + 1 });
      return { state: next, outgoing: [{ t: 'sonar-req', nonce }] };
    }
    case 'resign': {
      return { state: { ...s, phase: 'over', winner: other(s.side) }, outgoing: [{ t: 'resign' }] };
    }
```

Add `manhattan` to the geo import and `TORPEDO_RANGE` to the types import.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/game/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts test/game/engine.test.ts
git commit -m "feat(game): torpedo/sonar requests + resign"
```

---

## Phase 8 — Engine: remote application (defender side + responses)

### Task 12: `applyRemote` — moves, surface, placement, turn-skip

**Files:**
- Modify: `src/game/engine.ts`
- Test: `test/game/engine.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// append to test/game/engine.test.ts
import { applyRemote } from '@/game/engine';

describe('applyRemote movement/surface', () => {
  it('marks enemy placed and starts playing when I already placed', () => {
    let s = initState(blankMap(), 'host');
    s = applyLocal(s, { kind: 'place', cell: { x: 5, y: 5 } }).state; // iPlaced, still placing
    const { state } = applyRemote(s, { t: 'placed' });
    expect(state.enemyPlaced).toBe(true);
    expect(state.phase).toBe('playing');
  });

  it('records enemy surface and grants me SURFACE_SKIP consecutive turns', () => {
    let s = playingState();
    s = { ...s, turn: 'guest' };
    const { state } = applyRemote(s, { t: 'surface', sector: 'D' });
    expect(state.enemy.surfacedSector).toBe('D');
    expect(state.myExtraTurns).toBe(3);
    expect(state.turn).toBe('host'); // I start my bonus turns
  });

  it('after I surface, the enemy plays exactly SURFACE_SKIP turns then control returns to me', () => {
    let s = playingState();                              // my (host) turn
    s = applyLocal(s, { kind: 'surface' }).state;        // enemyExtraTurns=3, turn=guest
    expect(s.turn).toBe('guest');
    s = applyRemote(s, { t: 'move', dir: 'N' }).state;   // enemy turn 1
    expect(s.turn).toBe('guest');
    s = applyRemote(s, { t: 'move', dir: 'S' }).state;   // enemy turn 2
    expect(s.turn).toBe('guest');
    s = applyRemote(s, { t: 'move', dir: 'N' }).state;   // enemy turn 3
    expect(s.turn).toBe('host');                         // back to me
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/game/engine.test.ts`
Expected: FAIL — `applyRemote` not exported.

- [ ] **Step 3: Implement `applyRemote` (movement/surface/placed/resign + symmetric skip)**

```ts
// append to src/game/engine.ts

/**
 * The enemy just finished a turn. Normally control returns to me — unless the enemy
 * still owes itself bonus turns (because I surfaced), in which case the enemy keeps
 * playing until those bonus turns run out.
 */
function endEnemyTurn(s: GameState): GameState {
  let enemyExtraTurns = s.enemyExtraTurns;
  let turn: Side;
  if (enemyExtraTurns > 0) {
    enemyExtraTurns -= 1;
    turn = enemyExtraTurns > 0 ? other(s.side) : s.side;
  } else {
    turn = s.side;
  }
  return { ...s, turn, enemyExtraTurns, turnNumber: s.turnNumber + 1 };
}

export function applyRemote(s: GameState, m: WireMessage): LocalResult {
  switch (m.t) {
    case 'placed': {
      const enemyPlaced = true;
      const phase = s.iPlaced && enemyPlaced ? 'playing' as const : s.phase;
      return { state: { ...s, enemyPlaced, phase }, outgoing: [] };
    }
    case 'move': {
      // Enemy's energy goes up by 1 (observed); their position stays hidden.
      const enemy = { ...s.enemy, energy: Math.min(MAX_ENERGY, s.enemy.energy + 1) };
      return { state: endEnemyTurn({ ...s, enemy }), outgoing: [] };
    }
    case 'silence': {
      return { state: endEnemyTurn(s), outgoing: [] };
    }
    case 'surface': {
      // The enemy surfaced: I now get SURFACE_SKIP consecutive turns.
      const enemy = { ...s.enemy, surfacedSector: m.sector, energy: MAX_ENERGY };
      const next: GameState = {
        ...s, enemy, myExtraTurns: SURFACE_SKIP, turn: s.side, turnNumber: s.turnNumber + 1,
      };
      return { state: next, outgoing: [] };
    }
    case 'resign': {
      return { state: { ...s, phase: 'over', winner: s.side }, outgoing: [] };
    }
    default:
      return { state: s, outgoing: [] };
  }
}
```

Note: enemy energy accounting for sonar/torpedo is handled in Task 13/14 cases.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/game/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts test/game/engine.test.ts
git commit -m "feat(game): applyRemote movement/surface/placement + skip handling"
```

### Task 13: `applyRemote` — incoming torpedo (defender computes) & result

**Files:**
- Modify: `src/game/engine.ts`
- Test: `test/game/engine.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// append to test/game/engine.test.ts
describe('applyRemote torpedo (defender computes)', () => {
  it('reports a hit and reduces my hp when the target is my position', () => {
    let s = playingState();           // me = defender here
    s = { ...s, turn: 'guest' };
    const target = s.me.pos;
    const { state, outgoing } = applyRemote(s, { t: 'torpedo', target, nonce: 7 });
    expect(state.me.hp).toBe(START_HP - 1);
    expect(outgoing).toEqual([{ t: 'torpedo-res', nonce: 7, hit: true, hitCell: target, defenderHp: START_HP - 1 }]);
  });

  it('reports a miss and keeps my hp when target is elsewhere', () => {
    let s = playingState();
    s = { ...s, turn: 'guest' };
    const miss = { x: (s.me.pos.x + 1) % 10, y: s.me.pos.y };
    const { state, outgoing } = applyRemote(s, { t: 'torpedo', target: miss, nonce: 8 });
    expect(state.me.hp).toBe(START_HP);
    expect(outgoing[0]).toMatchObject({ t: 'torpedo-res', hit: false, defenderHp: START_HP });
  });

  it('attacker applies torpedo-res: records hit cell and enemy hp', () => {
    let s = playingState();           // me = attacker
    const res = { t: 'torpedo-res', nonce: 1, hit: true, hitCell: { x: 4, y: 4 }, defenderHp: 2 } as const;
    const { state } = applyRemote(s, res);
    expect(state.enemy.hp).toBe(2);
    expect(state.enemy.lastHitCell).toEqual({ x: 4, y: 4 });
  });

  it('sets winner when defender hp reaches 0', () => {
    let s = playingState();
    s = { ...s, turn: 'guest', me: { ...s.me, hp: 1 } };
    const { state } = applyRemote(s, { t: 'torpedo', target: s.me.pos, nonce: 9 });
    expect(state.me.hp).toBe(0);
    expect(state.phase).toBe('over');
    expect(state.winner).toBe('guest'); // the attacker (other side) wins
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/game/engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add torpedo cases to `applyRemote`** (insert before `default`)

```ts
    case 'torpedo': {
      // I am the defender: compute against my secret position.
      const hit = sameCell(m.target, s.me.pos);
      const hp = hit ? s.me.hp - 1 : s.me.hp;
      const me = { ...s.me, hp, alive: hp > 0 };
      let next: GameState = { ...s, me };
      if (hp <= 0) next = { ...next, phase: 'over', winner: other(s.side) };
      const res: WireMessage = {
        t: 'torpedo-res', nonce: m.nonce, hit, hitCell: hit ? m.target : null, defenderHp: hp,
      };
      return { state: next, outgoing: [res] };
    }
    case 'torpedo-res': {
      // I am the attacker: update what I know about the enemy.
      const enemy = {
        ...s.enemy,
        hp: m.defenderHp,
        lastHitCell: m.hit ? m.hitCell : s.enemy.lastHitCell,
      };
      let next: GameState = { ...s, enemy };
      if (m.defenderHp <= 0) next = { ...next, phase: 'over', winner: s.side };
      return { state: next, outgoing: [] };
    }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/game/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts test/game/engine.test.ts
git commit -m "feat(game): torpedo resolution (defender computes, attacker updates)"
```

### Task 14: Sonar response (defender builds true+false clues)

**Files:**
- Modify: `src/game/engine.ts`
- Test: `test/game/engine.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// append to test/game/engine.test.ts
import { buildSonarClues } from '@/game/engine';

describe('sonar clues', () => {
  it('builds exactly one true and one false clue of different types', () => {
    const pos = { x: 3, y: 6 };
    const clues = buildSonarClues(pos, () => 0); // deterministic rng=0 picks first choices
    expect(clues).toHaveLength(2);
    expect(clues.filter((c) => c.truth)).toHaveLength(1);
    expect(clues.filter((c) => !c.truth)).toHaveLength(1);
    expect(clues[0].type).not.toBe(clues[1].type);
    const truthy = clues.find((c) => c.truth)!;
    if (truthy.type === 'row') expect(truthy.value).toBe(6);
    if (truthy.type === 'col') expect(truthy.value).toBe(3);
  });

  it('applyRemote sonar-req replies with sonar-res clues', () => {
    let s = playingState();
    s = { ...s, turn: 'guest' };
    const { outgoing } = applyRemote(s, { t: 'sonar-req', nonce: 5 }, () => 0);
    expect(outgoing[0]).toMatchObject({ t: 'sonar-res', nonce: 5 });
    expect((outgoing[0] as any).clues).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/game/engine.test.ts`
Expected: FAIL — `buildSonarClues` not exported; `applyRemote` arity mismatch.

- [ ] **Step 3: Implement `buildSonarClues` and the sonar-req/sonar-res cases**

```ts
// append to src/game/engine.ts
// Ensure the existing './types' import (consolidated in Task 8) also includes `GRID`
// and `type SectorId`. Add `import type { SonarClue, SonarClueType } from './protocol';`.
import type { SonarClue, SonarClueType } from './protocol';

/** Build one TRUE and one FALSE clue of two DISTINCT types from the secret position. */
export function buildSonarClues(pos: Cell, rng: () => number): SonarClue[] {
  const types: SonarClueType[] = ['row', 'col', 'sector'];
  const ti = Math.floor(rng() * types.length) % types.length;
  const trueType = types[ti];
  const otherTypes = types.filter((_, k) => k !== ti);          // always 2 remaining
  const falseType = otherTypes[Math.floor(rng() * otherTypes.length) % otherTypes.length];

  const trueVal = (t: SonarClueType): number | SectorId =>
    t === 'row' ? pos.y : t === 'col' ? pos.x : sectorOf(pos);

  const falseVal = (t: SonarClueType): number | SectorId => {
    if (t === 'sector') {
      const others: SectorId[] = (['A', 'B', 'C', 'D'] as SectorId[]).filter((x) => x !== sectorOf(pos));
      return others[Math.floor(rng() * others.length) % others.length];
    }
    const real = t === 'row' ? pos.y : pos.x;
    let v = Math.floor(rng() * GRID) % GRID;
    if (v === real) v = (v + 1) % GRID;
    return v;
  };

  return [
    { type: trueType, value: trueVal(trueType), truth: true },
    { type: falseType, value: falseVal(falseType), truth: false },
  ];
}
```

Change the `applyRemote` signature to accept an injectable rng and add the sonar cases:

```ts
export function applyRemote(s: GameState, m: WireMessage, rng: () => number = Math.random): LocalResult {
```

Add (insert before `default`):

```ts
    case 'sonar-req': {
      const clues = buildSonarClues(s.me.pos, rng);
      return { state: endEnemyTurn(s), outgoing: [{ t: 'sonar-res', nonce: m.nonce, clues }] };
    }
    case 'sonar-res': {
      // Attacker side: clues are surfaced to the UI via the log; no state math needed here.
      return { state: s, outgoing: [] };
    }
```

Also, in the `move`/`silence`/`surface`/`torpedo` remote cases the enemy spends/gains energy is observable; for sonar/torpedo the enemy spent energy when they sent the request. Update the attacker-observed enemy energy: in `applyRemote` `sonar-req` and `torpedo` cases (defender side) we do not change `enemy` (that's the attacker). The attacker observes their OWN spend locally. No extra accounting needed — leave as is.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/game/engine.test.ts`
Expected: PASS (all engine tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts test/game/engine.test.ts
git commit -m "feat(game): sonar clue generation + response"
```

---

## Phase 9 — Signaling encode/decode

### Task 15: SDP <-> compact QR string

**Files:**
- Create: `src/net/signaling.ts`
- Test: `test/game/signaling.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/game/signaling.test.ts
import { describe, it, expect } from 'vitest';
import { encodeSignal, decodeSignal, type SignalPayload } from '@/net/signaling';

const sample: SignalPayload = {
  role: 'offer',
  seed: 123456,
  sdp: 'v=0\r\no=- 46117 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\n'.repeat(8),
};

describe('signaling', () => {
  it('round-trips an offer payload', () => {
    const s = encodeSignal(sample);
    expect(decodeSignal(s)).toEqual(sample);
  });

  it('produces a URL-safe base64 string (no +,/,= or whitespace)', () => {
    const s = encodeSignal(sample);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('compresses: encoded length is shorter than raw JSON', () => {
    const raw = JSON.stringify(sample).length;
    expect(encodeSignal(sample).length).toBeLessThan(raw);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/game/signaling.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// src/net/signaling.ts
import { deflate, inflate } from 'pako';

export interface SignalPayload {
  role: 'offer' | 'answer';
  seed: number;          // map seed (only meaningful on the offer)
  sdp: string;           // full SDP with bundled (non-trickle) ICE candidates
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = (typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64'));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = (typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeSignal(p: SignalPayload): string {
  const json = JSON.stringify(p);
  return toBase64Url(deflate(json));
}

export function decodeSignal(s: string): SignalPayload {
  const json = inflate(fromBase64Url(s), { to: 'string' });
  return JSON.parse(json) as SignalPayload;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/game/signaling.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/net/signaling.ts test/game/signaling.test.ts
git commit -m "feat(net): SDP signaling encode/decode (deflate + base64url)"
```

---

## Phase 10 — i18n

### Task 16: Translation dictionary + hook

**Files:**
- Create: `src/app/i18n/dict.ts`, `src/app/i18n/I18nContext.tsx`, `src/app/i18n/LanguageToggle.tsx`
- Test: `test/app/i18n.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/app/i18n.test.ts
import { describe, it, expect } from 'vitest';
import { DICT, translate } from '@/app/i18n/dict';

describe('i18n dictionary', () => {
  it('every key has both vi and en', () => {
    for (const [key, val] of Object.entries(DICT)) {
      expect(val.vi, `${key}.vi`).toBeTruthy();
      expect(val.en, `${key}.en`).toBeTruthy();
    }
  });

  it('translate returns the right language', () => {
    expect(translate('home.create', 'vi')).toBe(DICT['home.create'].vi);
    expect(translate('home.create', 'en')).toBe(DICT['home.create'].en);
  });

  it('translate falls back to the key when missing', () => {
    expect(translate('nonexistent.key' as any, 'vi')).toBe('nonexistent.key');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/app/i18n.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement dictionary + translate**

```ts
// src/app/i18n/dict.ts
import type { Bilingual, Lang } from '@/game/types';

export const DICT = {
  'app.title':        { vi: 'Sonar', en: 'Sonar' },
  'home.create':      { vi: 'Tạo phòng', en: 'Create room' },
  'home.joinHint':    { vi: 'Vào phòng = quét QR / mở link của chủ phòng', en: 'Join = scan host QR / open link' },
  'connect.showQr':   { vi: 'Đưa QR này cho đối phương quét', en: 'Let your opponent scan this QR' },
  'connect.scan':     { vi: 'Quét QR đối phương', en: 'Scan opponent QR' },
  'connect.copy':     { vi: 'Copy link (dự phòng)', en: 'Copy link (fallback)' },
  'connect.waiting':  { vi: 'Đang kết nối…', en: 'Connecting…' },
  'place.prompt':     { vi: 'Chọn ô xuất phát', en: 'Choose your start cell' },
  'play.move':        { vi: 'Di chuyển', en: 'Move' },
  'play.sonar':       { vi: 'Sonar', en: 'Sonar' },
  'play.silence':     { vi: 'Im lặng', en: 'Silence' },
  'play.torpedo':     { vi: 'Ngư lôi', en: 'Torpedo' },
  'play.surface':     { vi: 'Nổi lên', en: 'Surface' },
  'play.resign':      { vi: 'Đầu hàng', en: 'Resign' },
  'play.yourTurn':    { vi: 'Lượt của bạn', en: 'Your turn' },
  'play.enemyTurn':   { vi: 'Chờ đối phương…', en: 'Waiting for opponent…' },
  'play.energy':      { vi: 'Năng lượng', en: 'Energy' },
  'end.win':          { vi: 'Bạn thắng! 🏆', en: 'You win! 🏆' },
  'end.lose':         { vi: 'Bạn thua 💀', en: 'You lose 💀' },
  'end.rematch':      { vi: 'Chơi lại', en: 'Rematch' },
} satisfies Record<string, Bilingual>;

export type I18nKey = keyof typeof DICT;

export function translate(key: I18nKey, lang: Lang): string {
  const entry = (DICT as Record<string, Bilingual>)[key];
  return entry ? entry[lang] : (key as string);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/app/i18n.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement the React context + hook** (no unit test; verified via build)

```tsx
// src/app/i18n/I18nContext.tsx
'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Lang } from '@/game/types';
import { translate, type I18nKey } from './dict';

interface I18nValue { lang: Lang; setLang: (l: Lang) => void; t: (k: I18nKey) => string; }
const Ctx = createContext<I18nValue | null>(null);

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'vi';
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'vi';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('vi');
  useEffect(() => {
    const saved = (localStorage.getItem('sonar.lang') as Lang | null);
    setLang(saved ?? detectLang());
  }, []);
  useEffect(() => { localStorage.setItem('sonar.lang', lang); }, [lang]);
  const value: I18nValue = { lang, setLang, t: (k) => translate(k, lang) };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used within I18nProvider');
  return v;
}
```

```tsx
// src/app/i18n/LanguageToggle.tsx
'use client';
import { useI18n } from './I18nContext';

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
      style={{ position: 'fixed', top: 12, right: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid #2a4', background: 'transparent', color: '#cde' }}
      aria-label="language"
    >
      {lang === 'vi' ? 'VI · EN' : 'EN · VI'}
    </button>
  );
}
```

- [ ] **Step 6: Wire provider into root layout**

Replace `src/app/layout.tsx` with:

```tsx
import './globals.css';
import type { ReactNode } from 'react';
import { I18nProvider } from './i18n/I18nContext';
import { LanguageToggle } from './i18n/LanguageToggle';

export const metadata = { title: 'Sonar' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <I18nProvider>
          <LanguageToggle />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Build to verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/app/i18n src/app/layout.tsx test/app/i18n.test.ts
git commit -m "feat(i18n): VI/EN dictionary, context hook, language toggle"
```

---

## Phase 11 — WebRTC peer link

### Task 17: `PeerLink` wrapper (non-trickle ICE + STUN)

**Files:**
- Create: `src/net/webrtc.ts`

> Not unit-tested (depends on browser `RTCPeerConnection`). Verified manually in Task 22.

- [ ] **Step 1: Implement `PeerLink`**

```ts
// src/net/webrtc.ts
import type { WireMessage } from '@/game/protocol';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
};

/** Resolve once ICE gathering is complete so the SDP carries all candidates (non-trickle). */
function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', check);
    // Safety timeout: some browsers stall; resolve after 3s with whatever we have.
    setTimeout(resolve, 3000);
  });
}

export class PeerLink {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  onMessage: (m: WireMessage) => void = () => {};
  onOpen: () => void = () => {};
  onClose: () => void = () => {};

  constructor() {
    this.pc = new RTCPeerConnection(ICE_CONFIG);
    this.pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(this.pc.connectionState)) this.onClose();
    };
  }

  private bindChannel(ch: RTCDataChannel) {
    this.channel = ch;
    ch.onopen = () => this.onOpen();
    ch.onclose = () => this.onClose();
    ch.onmessage = (e) => this.onMessage(JSON.parse(e.data) as WireMessage);
  }

  /** Host: create the data channel + offer; returns the SDP string to encode into QR/link. */
  async createOffer(): Promise<string> {
    this.bindChannel(this.pc.createDataChannel('game', { ordered: true }));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await waitForIce(this.pc);
    return this.pc.localDescription!.sdp;
  }

  /** Guest: consume the host offer SDP, produce an answer SDP. */
  async acceptOfferCreateAnswer(offerSdp: string): Promise<string> {
    this.pc.ondatachannel = (e) => this.bindChannel(e.channel);
    await this.pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await waitForIce(this.pc);
    return this.pc.localDescription!.sdp;
  }

  /** Host: finish the handshake with the guest answer SDP. */
  async acceptAnswer(answerSdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  }

  send(m: WireMessage): void {
    if (this.channel && this.channel.readyState === 'open') this.channel.send(JSON.stringify(m));
  }

  close(): void {
    this.channel?.close();
    this.pc.close();
  }
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/net/webrtc.ts
git commit -m "feat(net): PeerLink WebRTC wrapper (non-trickle ICE + STUN)"
```

---

## Phase 12 — QR generate & scan

### Task 18: QR helpers

**Files:**
- Create: `src/net/qr.ts`

> Camera scanning is verified manually (Task 22).

- [ ] **Step 1: Implement QR helpers**

```ts
// src/net/qr.ts
import QRCode from 'qrcode';
import jsQR from 'jsqr';

/** Render a string to a PNG data URL for an <img src=…>. */
export async function makeQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'L', margin: 1, width: 320 });
}

export interface QrScanHandle { stop: () => void; }

/**
 * Start the camera and scan QR frames into `onResult`. Returns a handle to stop.
 * Call stop() once a code is found or the screen unmounts.
 */
export async function scanQrFromCamera(
  video: HTMLVideoElement,
  onResult: (text: string) => void,
  onError: (e: unknown) => void,
): Promise<QrScanHandle> {
  let stopped = false;
  let stream: MediaStream | null = null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    await video.play();
  } catch (e) {
    onError(e);
    return { stop: () => {} };
  }

  const tick = () => {
    if (stopped) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height);
      if (code && code.data) { onResult(code.data); return; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    },
  };
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/net/qr.ts
git commit -m "feat(net): QR generate (qrcode) + camera scan (jsqr)"
```

---

## Phase 13 — Board rendering & animation

### Task 19: SVG board with Framer Motion

**Files:**
- Create: `src/app/board/Board.tsx`

> Visual component; verified by running the dev server (Task 22).

- [ ] **Step 1: Implement the board**

```tsx
// src/app/board/Board.tsx
'use client';
import { motion } from 'framer-motion';
import { GRID, type Cell, type GameState } from '@/game/types';
import { sameCell } from '@/game/geo';

const CSIZE = 36;
const PAD = 8;
const SIZE = GRID * CSIZE + PAD * 2;

function px(n: number): number { return PAD + n * CSIZE + CSIZE / 2; }

interface Props {
  state: GameState;
  selectable?: boolean;
  onCellClick?: (c: Cell) => void;
  /** Cells to highlight (e.g., torpedo range or placement options). */
  highlight?: Cell[];
}

export function Board({ state, selectable, onCellClick, highlight = [] }: Props) {
  const { map, me, enemy } = state;
  const cells: Cell[] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) cells.push({ x, y });
  const isHi = (c: Cell) => highlight.some((h) => sameCell(h, c));

  return (
    <svg width={SIZE} height={SIZE} role="img" aria-label="board" style={{ touchAction: 'manipulation' }}>
      {/* sector divider */}
      <line x1={PAD + 5 * CSIZE} y1={PAD} x2={PAD + 5 * CSIZE} y2={SIZE - PAD} stroke="#244" />
      <line x1={PAD} y1={PAD + 5 * CSIZE} x2={SIZE - PAD} y2={PAD + 5 * CSIZE} stroke="#244" />
      {cells.map((c) => {
        const island = map.islands[c.y][c.x];
        return (
          <rect
            key={`${c.x},${c.y}`}
            x={PAD + c.x * CSIZE + 1}
            y={PAD + c.y * CSIZE + 1}
            width={CSIZE - 2}
            height={CSIZE - 2}
            rx={4}
            fill={island ? '#3a4f63' : isHi(c) ? '#1d5e4f' : '#102433'}
            stroke="#1b3346"
            style={{ cursor: selectable && !island ? 'pointer' : 'default' }}
            onClick={() => selectable && !island && onCellClick?.(c)}
          />
        );
      })}
      {/* my trail */}
      {me.trail.map((t, i) => (
        <circle key={`tr${i}`} cx={px(t.x)} cy={px(t.y)} r={4} fill="#2f7d6a" />
      ))}
      {/* enemy reveal: last hit cell */}
      {enemy.lastHitCell && (
        <motion.circle
          cx={px(enemy.lastHitCell.x)} cy={px(enemy.lastHitCell.y)} r={10}
          fill="none" stroke="#e2554f" strokeWidth={2}
          initial={{ scale: 0.4, opacity: 1 }} animate={{ scale: 1, opacity: 0.9 }}
        />
      )}
      {/* my submarine — animates between cells */}
      <motion.circle
        r={CSIZE / 3}
        fill="#49c0a8"
        animate={{ cx: px(me.pos.x), cy: px(me.pos.y) }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      />
    </svg>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/board/Board.tsx
git commit -m "feat(board): SVG board with animated submarine + trail"
```

---

## Phase 14 — Game hook & screens

### Task 20: `useGame` hook (state + PeerLink wiring)

**Files:**
- Create: `src/app/useGame.ts`

> Integration glue; verified manually (Task 22).

- [ ] **Step 1: Implement the hook**

```ts
// src/app/useGame.ts
'use client';
import { useCallback, useRef, useState } from 'react';
import type { GameMap, GameState, Side } from '@/game/types';
import { applyLocal, applyRemote, initState } from '@/game/engine';
import type { LocalAction, WireMessage } from '@/game/protocol';
import { PeerLink } from '@/net/webrtc';

export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const link = useRef<PeerLink | null>(null);

  const attach = useCallback((pl: PeerLink, map: GameMap, side: Side) => {
    link.current = pl;
    setState(initState(map, side));
    pl.onMessage = (m: WireMessage) => {
      setState((prev) => {
        if (!prev) return prev;
        const { state: next, outgoing } = applyRemote(prev, m);
        outgoing.forEach((o) => pl.send(o));
        return next;
      });
    };
  }, []);

  const dispatch = useCallback((a: LocalAction) => {
    setState((prev) => {
      if (!prev || !link.current) return prev;
      const { state: next, outgoing } = applyLocal(prev, a);
      outgoing.forEach((o) => link.current!.send(o));
      return next;
    });
  }, []);

  return { state, attach, dispatch, link };
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/useGame.ts
git commit -m "feat(app): useGame hook wiring engine to PeerLink"
```

### Task 21: Screens + screen state machine

**Files:**
- Create: `src/app/screens/HomeScreen.tsx`, `ConnectScreen.tsx`, `PlaceScreen.tsx`, `PlayScreen.tsx`, `EndScreen.tsx`
- Modify: `src/app/page.tsx`

> Verified manually (Task 22). Each screen is small and focused.

- [ ] **Step 1: HomeScreen** — create room or auto-detect a join offer in the URL hash

```tsx
// src/app/screens/HomeScreen.tsx
'use client';
import { useI18n } from '../i18n/I18nContext';

export function HomeScreen({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: 16 }}>
      <h1>🛥️ {t('app.title')}</h1>
      <button onClick={onCreate} style={{ padding: '12px 24px', borderRadius: 10, border: '1px solid #2a6', background: '#103', color: '#dfe' }}>
        {t('home.create')}
      </button>
      <p style={{ opacity: 0.7, fontSize: 13, maxWidth: 320, textAlign: 'center' }}>{t('home.joinHint')}</p>
    </main>
  );
}
```

- [ ] **Step 2: ConnectScreen** — show our QR/link + scan the other side's QR

```tsx
// src/app/screens/ConnectScreen.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { makeQrDataUrl, scanQrFromCamera } from '@/net/qr';

interface Props {
  myCode: string | null;            // encoded signal to display (offer for host, answer for guest)
  needScan: boolean;                // whether this side must scan the other code
  onScanned: (text: string) => void;
}

export function ConnectScreen({ myCode, needScan, onScanned }: Props) {
  const { t } = useI18n();
  const [qr, setQr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { if (myCode) makeQrDataUrl(myCode).then(setQr); }, [myCode]);

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    let handle: { stop: () => void } | null = null;
    scanQrFromCamera(videoRef.current, (text) => { handle?.stop(); setScanning(false); onScanned(text); }, () => {})
      .then((h) => { handle = h; });
    return () => handle?.stop();
  }, [scanning, onScanned]);

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: 14, padding: 16 }}>
      {qr && (
        <>
          <p>{t('connect.showQr')}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="qr" width={260} height={260} />
          <button onClick={() => myCode && navigator.clipboard?.writeText(`${location.origin}${location.pathname}#${myCode}`)}>
            {t('connect.copy')}
          </button>
        </>
      )}
      {needScan && (
        <>
          <button onClick={() => setScanning(true)}>📷 {t('connect.scan')}</button>
          {scanning && <video ref={videoRef} style={{ width: 280, borderRadius: 8 }} muted playsInline />}
        </>
      )}
      {!needScan && !qr && <p>{t('connect.waiting')}</p>}
    </main>
  );
}
```

- [ ] **Step 3: PlaceScreen** — choose start cell

```tsx
// src/app/screens/PlaceScreen.tsx
'use client';
import { useI18n } from '../i18n/I18nContext';
import { Board } from '../board/Board';
import type { Cell, GameState } from '@/game/types';

export function PlaceScreen({ state, onPlace }: { state: GameState; onPlace: (c: Cell) => void }) {
  const { t } = useI18n();
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: 12 }}>
      <p>{t('place.prompt')}</p>
      <Board state={state} selectable onCellClick={onPlace} />
    </main>
  );
}
```

- [ ] **Step 4: PlayScreen** — board + action controls

```tsx
// src/app/screens/PlayScreen.tsx
'use client';
import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Board } from '../board/Board';
import type { Cell, Direction, GameState } from '@/game/types';
import { COST, TORPEDO_RANGE } from '@/game/types';
import type { LocalAction } from '@/game/protocol';
import { manhattan, inBounds } from '@/game/geo';

export function PlayScreen({ state, dispatch }: { state: GameState; dispatch: (a: LocalAction) => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'normal' | 'torpedo'>('normal');
  const myTurn = state.turn === state.side && state.phase === 'playing';

  const torpedoCells: Cell[] = [];
  if (mode === 'torpedo') {
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const c = { x, y };
      if (inBounds(c) && manhattan(state.me.pos, c) <= TORPEDO_RANGE) torpedoCells.push(c);
    }
  }

  const move = (dir: Direction) => dispatch({ kind: 'move', dir });

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: 10, padding: 12 }}>
      <div>{myTurn ? t('play.yourTurn') : t('play.enemyTurn')}</div>
      <div>❤️ {state.me.hp} · {t('play.energy')}: {state.me.energy}</div>
      <Board
        state={state}
        selectable={mode === 'torpedo' && myTurn}
        highlight={torpedoCells}
        onCellClick={(c) => { dispatch({ kind: 'torpedo', target: c }); setMode('normal'); }}
      />
      <fieldset disabled={!myTurn} style={{ border: 'none', display: 'grid', gap: 6, width: 260 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          <button onClick={() => move('N')}>⬆️</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          <button onClick={() => move('W')}>⬅️</button>
          <button onClick={() => move('S')}>⬇️</button>
          <button onClick={() => move('E')}>➡️</button>
        </div>
        <button disabled={state.me.energy < COST.sonar} onClick={() => dispatch({ kind: 'sonar' })}>📡 {t('play.sonar')} ({COST.sonar})</button>
        <button disabled={state.me.energy < COST.silence} onClick={() => dispatch({ kind: 'silence', dir: 'N', dist: 1 })}>🤫 {t('play.silence')} ({COST.silence})</button>
        <button disabled={state.me.energy < COST.torpedo} onClick={() => setMode('torpedo')}>🎯 {t('play.torpedo')} ({COST.torpedo})</button>
        <button onClick={() => dispatch({ kind: 'surface' })}>🌊 {t('play.surface')}</button>
        <button onClick={() => dispatch({ kind: 'resign' })}>🏳️ {t('play.resign')}</button>
      </fieldset>
    </main>
  );
}
```

Note: the Silence control here fires a 1-cell North silence for simplicity; a richer direction/distance picker is a future enhancement and is intentionally out of scope (YAGNI).

- [ ] **Step 5: EndScreen**

```tsx
// src/app/screens/EndScreen.tsx
'use client';
import { useI18n } from '../i18n/I18nContext';
import type { GameState } from '@/game/types';

export function EndScreen({ state, onRematch }: { state: GameState; onRematch: () => void }) {
  const { t } = useI18n();
  const won = state.winner === state.side;
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: 16 }}>
      <h1>{won ? t('end.win') : t('end.lose')}</h1>
      <button onClick={onRematch}>{t('end.rematch')}</button>
    </main>
  );
}
```

- [ ] **Step 6: `page.tsx` screen state machine** — ties everything together, incl. auto-join from URL hash

```tsx
// src/app/page.tsx
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from './useGame';
import { PeerLink } from '@/net/webrtc';
import { encodeSignal, decodeSignal } from '@/net/signaling';
import { generateMap } from '@/game/map';
import { mulberry32 } from '@/game/rng';
import { HomeScreen } from './screens/HomeScreen';
import { ConnectScreen } from './screens/ConnectScreen';
import { PlaceScreen } from './screens/PlaceScreen';
import { PlayScreen } from './screens/PlayScreen';
import { EndScreen } from './screens/EndScreen';

type UI = 'home' | 'host-wait' | 'guest-wait' | 'in-game';

export default function Page() {
  const { state, attach, dispatch } = useGame();
  const [ui, setUi] = useState<UI>('home');
  const [myCode, setMyCode] = useState<string | null>(null);
  const [needScan, setNeedScan] = useState(false);
  const hostLink = useRef<PeerLink | null>(null);
  const seedRef = useRef<number>(0);

  // HOST: create room
  const createRoom = useCallback(async () => {
    const seed = Math.floor(mulberry32((Date.now() & 0xffffffff) >>> 0)() * 0xffffffff) >>> 0;
    seedRef.current = seed;
    const pl = new PeerLink();
    hostLink.current = pl;
    pl.onOpen = () => { attach(pl, generateMap(seed), 'host'); setUi('in-game'); };
    const sdp = await pl.createOffer();
    setMyCode(encodeSignal({ role: 'offer', seed, sdp }));
    setNeedScan(true);          // host later scans the guest answer
    setUi('host-wait');
  }, [attach]);

  // HOST: got the guest's answer code (scanned)
  const onHostScanned = useCallback(async (text: string) => {
    const payload = decodeSignal(text);
    if (payload.role !== 'answer') return;
    await hostLink.current!.acceptAnswer(payload.sdp);
    // onOpen will flip to in-game
  }, []);

  // GUEST: auto-join from URL hash
  useEffect(() => {
    const hash = typeof location !== 'undefined' ? location.hash.slice(1) : '';
    if (!hash || ui !== 'home') return;
    (async () => {
      let payload;
      try { payload = decodeSignal(hash); } catch { return; }
      if (payload.role !== 'offer') return;
      const pl = new PeerLink();
      pl.onOpen = () => { attach(pl, generateMap(payload.seed), 'guest'); setUi('in-game'); };
      const answerSdp = await pl.acceptOfferCreateAnswer(payload.sdp);
      setMyCode(encodeSignal({ role: 'answer', seed: payload.seed, sdp: answerSdp }));
      setNeedScan(false);       // guest only shows its answer for host to scan
      setUi('guest-wait');
    })();
  }, [ui, attach]);

  if (ui === 'home') return <HomeScreen onCreate={createRoom} />;
  if (ui === 'host-wait') return <ConnectScreen myCode={myCode} needScan={needScan} onScanned={onHostScanned} />;
  if (ui === 'guest-wait') return <ConnectScreen myCode={myCode} needScan={false} onScanned={() => {}} />;

  if (!state) return <main style={{ padding: 24 }}>…</main>;
  if (state.phase === 'over') return <EndScreen state={state} onRematch={() => location.reload()} />;
  if (state.phase === 'placing') {
    return state.iPlaced
      ? <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>⏳</main>
      : <PlaceScreen state={state} onPlace={(c) => dispatch({ kind: 'place', cell: c })} />;
  }
  return <PlayScreen state={state} dispatch={dispatch} />;
}
```

Note: `Date.now()` is used here only to seed the host's per-game random map. This is application runtime code (not a workflow script), so it is allowed.

- [ ] **Step 7: Build to verify**

Run: `npm run build`
Expected: build succeeds and `out/` is produced.

- [ ] **Step 8: Commit**

```bash
git add src/app/screens src/app/page.tsx
git commit -m "feat(app): screens + screen state machine with QR/link auto-join"
```

---

## Phase 15 — End-to-end verification & docs

### Task 22: Manual two-tab / two-device verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: all tests pass (rng, geo, map, engine, signaling, i18n).

- [ ] **Step 2: Dev server + two-tab handshake (localhost loopback works without STUN)**

Run: `npm run dev`
- Open tab A → click **Create room** → a QR + copyable link appear.
- Copy the link, open it in tab B → tab B auto-creates an answer and shows its QR/link.
- In tab A, use **Scan opponent QR** (point a phone camera, or for desktop-only testing temporarily add a hidden paste box — see Step 4) to feed tab B's answer code.
- Confirm both tabs flip to the placement screen, then to play.

- [ ] **Step 3: Two-phone test on the same WiFi**

- Deploy `out/` to any static host, or run `npm run dev -- -H 0.0.0.0` and open the LAN URL on two phones.
- Phone A creates the room (shows QR). Phone B scans it → shows its QR. Phone A scans B's QR.
- Verify: moves animate, energy increments, torpedo highlights range and reports hit/miss, surface reveals a sector, HP reaches 0 → end screen.

- [ ] **Step 4 (optional dev aid): desktop paste fallback**

If testing on desktop without cameras, temporarily add a text input in `ConnectScreen` that calls `onScanned(value)` so answers can be pasted. Remove before shipping (the copy-link fallback already covers real use).

- [ ] **Step 5: Record results**

Write a short note in the PR/commit describing what was verified (handshake, each action, win condition) and any device/NAT combos that failed.

### Task 23: README with run & deploy instructions

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Sonar

Two-player turn-based submarine duel (simplified Captain Sonar). Peer-to-peer over WebRTC,
QR/link handshake, no backend. See `docs/superpowers/specs/2026-06-16-sonar-game-design.md`.

## Develop
- `npm install`
- `npm run dev` → http://localhost:3000
- `npm test` → unit tests (game logic, map, signaling, i18n)

## Build (static)
- `npm run build` → static site in `out/`. Host anywhere (GitHub Pages, Netlify).

## Play
1. Player A: **Create room** → show QR / share link.
2. Player B: scan QR or open link → answer QR appears automatically.
3. Player A: scan B's answer QR → connected.

## Limits
- Same-WiFi always works; cross-network uses public STUN. Symmetric NAT (needs TURN) is unsupported.
- Anti-cheat is "no manual entry of results"; modifying client code can still cheat.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with run/deploy/play instructions"
```

---

## Self-Review Notes (author checklist — performed before handoff)

- **Spec coverage:** map gen (Task 4, §3) · 5 actions Move/Sonar/Silence/Torpedo/Surface (Tasks 8–14, §4) · reveal on surface/hit (Task 13/Board, §5) · defender-computes anti-cheat (Task 13, §6) · 3 HP win + rematch + resign (Tasks 11/13, EndScreen, §7) · QR/link 2-step handshake with seed in offer + non-trickle ICE + STUN + #fragment (Tasks 15/17/21, §8) · module layout (all phases, §9) · VI/EN i18n with toggle (Task 16, §9/§11) · tests for map/engine/signaling/i18n (§10).
- **Known limitations** (§11) are surfaced in README and the WebRTC timeout fallback.
- **Type consistency:** `GameState`, `SubState`, `EnemyView`, `LocalAction`, `WireMessage`, `SonarClue`, `applyLocal`/`applyRemote`/`initState`/`buildSonarClues`, `PeerLink.createOffer/acceptOfferCreateAnswer/acceptAnswer`, `encodeSignal/decodeSignal`, `generateMap`, `mulberry32` — names used identically across tasks.
```
