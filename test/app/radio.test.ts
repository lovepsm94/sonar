// test/app/radio.test.ts
import { describe, it, expect } from 'vitest';
import { compute, silenceFan, advancePinned, type Pinned } from '@/app/radio';
import { GRID, type Cell, type GameMap } from '@/game/types';

function blankMap(islands: Cell[] = []): GameMap {
  const grid = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => false));
  islands.forEach((c) => { grid[c.y][c.x] = true; });
  return { seed: 1, size: GRID, islands: grid };
}
const has = (cells: Cell[], c: Cell) => cells.some((p) => p.x === c.x && p.y === c.y);

describe('radio compute (auto candidate set)', () => {
  it('with no declared moves, every water cell is possible and started is false', () => {
    const r = compute([], blankMap());
    expect(r.count).toBe(100);
    expect(r.started).toBe(false);
    expect(r.lastKind).toBeNull();
  });

  it('a single move N drops the cells that would leave the board', () => {
    const r = compute([{ kind: 'move', dir: 'N' }], blankMap());
    expect(r.count).toBe(90);           // start rows 1..9 survive -> current rows 0..8
    expect(has(r.cells, { x: 4, y: 9 })).toBe(false); // nothing ends on the bottom row
  });

  it('surface collapses to the exact revealed cell', () => {
    const r = compute([{ kind: 'surface', cell: { x: 3, y: 4 } }], blankMap());
    expect(r.cells).toEqual([{ x: 3, y: 4 }]);
    expect(r.count).toBe(1);
  });

  it('a sonar row reveal filters candidates to that row', () => {
    const r = compute([{ kind: 'sonar', axis: 'row', value: 2 }], blankMap());
    expect(r.count).toBe(10);
    expect(r.cells.every((c) => c.y === 2)).toBe(true);
  });

  it('no-self-cross: moving N then back S kills every candidate', () => {
    const r = compute([{ kind: 'move', dir: 'N' }, { kind: 'move', dir: 'S' }], blankMap());
    expect(r.count).toBe(0);
  });

  it('a representative trail is kept per possible cell', () => {
    const r = compute([{ kind: 'surface', cell: { x: 3, y: 4 } }, { kind: 'move', dir: 'E' }], blankMap());
    expect(r.cells).toEqual([{ x: 4, y: 4 }]);
    expect(r.repTrail.get('4,4')).toEqual([{ x: 3, y: 4 }, { x: 4, y: 4 }]);
  });
});

describe('radio silenceFan', () => {
  it('fans out to stay + up to 3 cells in each open direction', () => {
    const fan = silenceFan(blankMap(), { x: 5, y: 5 }, [{ x: 5, y: 5 }]);
    expect(fan).toHaveLength(13);                       // 1 (stay) + 4 dirs * 3
    expect(has(fan.map((o) => o.cell), { x: 5, y: 5 })).toBe(true);
    expect(has(fan.map((o) => o.cell), { x: 5, y: 2 })).toBe(true); // 3 north
  });

  it('an island blocks the fan in that direction', () => {
    const fan = silenceFan(blankMap([{ x: 5, y: 4 }]), { x: 5, y: 5 }, [{ x: 5, y: 5 }]);
    expect(has(fan.map((o) => o.cell), { x: 5, y: 4 })).toBe(false);
    expect(has(fan.map((o) => o.cell), { x: 5, y: 3 })).toBe(false);
  });
});

describe('radio advancePinned (single hypothesis)', () => {
  const pin = (pos: Cell, trail: Cell[]): Pinned => ({ pos, trail, fanning: false });

  it('move advances the hypothesis and extends its trail', () => {
    const next = advancePinned(pin({ x: 5, y: 5 }, [{ x: 5, y: 5 }]), { kind: 'move', dir: 'N' }, blankMap());
    expect(next).toEqual({ pos: { x: 5, y: 4 }, trail: [{ x: 5, y: 5 }, { x: 5, y: 4 }], fanning: false });
  });

  it('a move back into its own trail kills the hypothesis', () => {
    const next = advancePinned(pin({ x: 5, y: 4 }, [{ x: 5, y: 5 }, { x: 5, y: 4 }]), { kind: 'move', dir: 'S' }, blankMap());
    expect(next).toBeNull();
  });

  it('silence puts the hypothesis into fanning mode from its current cell', () => {
    const next = advancePinned(pin({ x: 5, y: 5 }, [{ x: 5, y: 5 }]), { kind: 'silence' }, blankMap());
    expect(next).toMatchObject({ fanning: true, fanFrom: { x: 5, y: 5 } });
  });

  it('surface resets the hypothesis to the revealed cell', () => {
    const next = advancePinned(pin({ x: 1, y: 1 }, [{ x: 1, y: 1 }]), { kind: 'surface', cell: { x: 8, y: 8 } }, blankMap());
    expect(next).toEqual({ pos: { x: 8, y: 8 }, trail: [{ x: 8, y: 8 }], fanning: false });
  });

  it('a sonar reveal kills a hypothesis that is off the revealed line, keeps an on-line one', () => {
    const off = advancePinned(pin({ x: 5, y: 5 }, [{ x: 5, y: 5 }]), { kind: 'sonar', axis: 'row', value: 2 }, blankMap());
    expect(off).toBeNull();
    const on = advancePinned(pin({ x: 5, y: 2 }, [{ x: 5, y: 2 }]), { kind: 'sonar', axis: 'row', value: 2 }, blankMap());
    expect(on).toMatchObject({ pos: { x: 5, y: 2 } });
  });
});
