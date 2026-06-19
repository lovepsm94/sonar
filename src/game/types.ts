export const GRID = 10;            // 10x10 board
export const SECTOR_SIZE = 5;      // 4 sectors of 5x5
// Balance tuned down from the design spec's 6/3 for faster games — this file is the source of truth.
export const MAX_ENERGY = 4;
export const START_HP = 2;
export const TORPEDO_RANGE = 4;    // Manhattan distance
export const SILENCE_MAX = 3;      // max cells per Silence
export const SURFACE_SKIP = 3;     // turns skipped after surfacing
export const ISLAND_MIN = 10;      // min islands on a map
export const ISLAND_MAX = 15;      // max islands on a map
export const ISLAND_MIN_GAP = 2;   // Chebyshev gap between islands

export const COST = { sonar: 2, silence: 3, torpedo: 4 } as const;

export type Lang = 'vi' | 'en';
export type Direction = 'N' | 'S' | 'E' | 'W';
export type SectorId = 'A' | 'B' | 'C' | 'D';
export type Side = 'host' | 'guest';
export type Phase = 'placing' | 'playing' | 'over';

export interface Cell { x: number; y: number; }
export interface Bilingual { vi: string; en: string; }

/** A truthful coordinate line a sub revealed under Sonar (row = y index, col = x index). */
export interface RevealedLine { axis: 'row' | 'col'; value: number; }

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
  surfaced: boolean;       // sitting on the surface (set on surface, cleared on move/silence) — visual state
  revealedLine: RevealedLine | null;  // the true row/col I leaked under enemy Sonar (cleared when I move)
}

export interface EnemyView {
  hp: number;
  surfacedSector: SectorId | null;
  surfacedCell: Cell | null;  // exact cell, revealed while the enemy sits surfaced (cleared when they re-submerge)
  lastHitCell: Cell | null;
  revealedLine: RevealedLine | null;  // the enemy's true row/col, forced out by my Sonar (cleared when they move)
}

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
  nextNonce: number;
  pendingSonar: number | null;  // nonce of an enemy Sonar I must answer by revealing a true line (defender)
}
