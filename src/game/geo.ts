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
