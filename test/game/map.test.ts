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
