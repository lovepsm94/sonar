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
