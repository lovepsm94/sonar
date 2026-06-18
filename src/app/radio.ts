// src/app/radio.ts
// "Radio Operator" enemy-track inference (presentation layer, pure & deterministic).
// From the enemy's DECLARED moves, maintain the set of still-possible current cells
// (auto) and steer a single manual hypothesis. Never touches game-engine state.
import { GRID, type Cell, type Direction, type GameMap } from '@/game/types';
import { inBounds, step, sameCell } from '@/game/geo';

/** One declared enemy action, as observed off the wire. */
export type Decl =
  | { kind: 'move'; dir: Direction }
  | { kind: 'silence' }
  | { kind: 'surface'; cell: Cell }
  | { kind: 'sonar'; axis: 'row' | 'col'; value: number }
  | { kind: 'torpedo'; target: Cell };

/** A single hypothesis: where the enemy currently is + its path since last surface. */
export interface Pinned { pos: Cell; trail: Cell[]; fanning: boolean; fanFrom?: Cell; }

export interface FanOption { cell: Cell; path: Cell[]; }

export interface RadioState {
  cells: Cell[];                    // distinct possible current cells
  count: number;
  repTrail: Map<string, Cell[]>;    // cellKey -> a representative path reaching it
  lastKind: Decl['kind'] | null;
  started: boolean;
}

const DIRS: Direction[] = ['N', 'S', 'E', 'W'];
const SILENCE_MAX = 3;

const idx = (c: Cell): number => c.y * GRID + c.x;
const key = (c: Cell): string => c.x + ',' + c.y;
const isWater = (map: GameMap, c: Cell): boolean => inBounds(c) && !map.islands[c.y][c.x];
const trailHas = (trail: Cell[], c: Cell): boolean => trail.some((p) => sameCell(p, c));
const visKey = (trail: Cell[]): string => trail.map(idx).sort((a, b) => a - b).join('.');

// candidate = { pos, trail:[cells] } where trail = path since last surface (incl. pos)
interface Cand { pos: Cell; trail: Cell[]; }

function init(map: GameMap): Cand[] {
  const out: Cand[] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const c = { x, y };
    if (isWater(map, c)) out.push({ pos: c, trail: [c] });
  }
  return out;
}

function dedupe(cands: Cand[]): Cand[] {
  const seen = new Map<string, Cand>();
  for (const cn of cands) {
    const k = idx(cn.pos) + '#' + visKey(cn.trail);
    if (!seen.has(k)) seen.set(k, cn);
  }
  return [...seen.values()];
}

function dedupePosOnly(cands: Cand[]): Cand[] {
  const seen = new Map<string, Cand>();
  for (const cn of cands) if (!seen.has(key(cn.pos))) seen.set(key(cn.pos), cn);
  return [...seen.values()];
}

function applyMove(cands: Cand[], dir: Direction, map: GameMap): Cand[] {
  const out: Cand[] = [];
  for (const cn of cands) {
    const n = step(cn.pos, dir);
    if (isWater(map, n) && !trailHas(cn.trail, n)) out.push({ pos: n, trail: [...cn.trail, n] });
  }
  return dedupe(out);
}

// silence = slip 0..SILENCE_MAX cells in ONE straight direction (cannot cross own path)
function applySilence(cands: Cand[], map: GameMap): Cand[] {
  const out: Cand[] = [];
  for (const cn of cands) {
    out.push({ pos: cn.pos, trail: cn.trail });   // distance 0
    for (const d of DIRS) {
      let p = cn.pos, trail = cn.trail;
      for (let k = 1; k <= SILENCE_MAX; k++) {
        const n = step(p, d);
        if (!isWater(map, n) || trailHas(trail, n)) break;
        trail = [...trail, n]; p = n;
        out.push({ pos: n, trail });
      }
    }
  }
  let d = dedupe(out);
  if (d.length > 4000) d = dedupePosOnly(d);       // guard against combinatorial blow-up
  return d;
}

function applySurface(_cands: Cand[], cell: Cell): Cand[] {
  return [{ pos: cell, trail: [cell] }];           // collapse to the exact cell + reset trail
}

function applySonar(cands: Cand[], axis: 'row' | 'col', value: number): Cand[] {
  return cands.filter((cn) => (axis === 'row' ? cn.pos.y === value : cn.pos.x === value));
}

/** Run all declared moves → possible cells + a representative trail per cell. */
export function compute(moves: Decl[], map: GameMap): RadioState {
  let cands = init(map);
  for (const m of moves) {
    if (m.kind === 'move') cands = applyMove(cands, m.dir, map);
    else if (m.kind === 'silence') cands = applySilence(cands, map);
    else if (m.kind === 'surface') cands = applySurface(cands, m.cell);
    else if (m.kind === 'sonar') cands = applySonar(cands, m.axis, m.value);
    // torpedo: informational only
    if (!cands.length) break;
  }
  const repTrail = new Map<string, Cell[]>();
  const cells: Cell[] = [];
  for (const cn of cands) {
    const k = key(cn.pos);
    if (!repTrail.has(k)) { repTrail.set(k, cn.trail); cells.push(cn.pos); }
  }
  const lastKind = moves.length ? moves[moves.length - 1].kind : null;
  return { cells, count: cells.length, repTrail, lastKind, started: moves.length > 0 };
}

/** Cells reachable by a silence from a pinned hypothesis (incl. staying put). */
export function silenceFan(map: GameMap, pos: Cell, trail: Cell[]): FanOption[] {
  const out: FanOption[] = [{ cell: pos, path: [pos] }];
  for (const d of DIRS) {
    let p = pos, path = [pos], tr = trail;
    for (let k = 1; k <= SILENCE_MAX; k++) {
      const n = step(p, d);
      if (!isWater(map, n) || trailHas(tr, n)) break;
      path = [...path, n]; tr = [...tr, n]; p = n;
      out.push({ cell: n, path });
    }
  }
  return out;
}

/** Steer the single manual hypothesis as a new declaration arrives. null = hypothesis killed. */
export function advancePinned(pinned: Pinned | null, decl: Decl, map: GameMap): Pinned | null {
  if (!pinned) return null;
  if (decl.kind === 'move') {
    const n = step(pinned.pos, decl.dir);
    if (!isWater(map, n) || trailHas(pinned.trail, n)) return null;
    return { pos: n, trail: [...pinned.trail, n], fanning: false };
  }
  if (decl.kind === 'silence') return { ...pinned, fanning: true, fanFrom: pinned.pos };
  if (decl.kind === 'surface') return { pos: decl.cell, trail: [decl.cell], fanning: false };
  if (decl.kind === 'sonar') {
    const on = decl.axis === 'row' ? pinned.pos.y === decl.value : pinned.pos.x === decl.value;
    return on ? { ...pinned, fanning: false } : null;
  }
  return pinned;   // torpedo: no effect on the hypothesis
}
