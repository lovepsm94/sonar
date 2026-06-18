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
