// src/game/protocol.ts
import type { Cell, Direction, SectorId } from './types';

/** Actions the local UI dispatches for THIS player. */
export type LocalAction =
  | { kind: 'place'; cell: Cell }
  | { kind: 'move'; dir: Direction }
  | { kind: 'silence'; dir: Direction; dist: number }   // dist 0..SILENCE_MAX
  | { kind: 'sonar' }
  | { kind: 'sonar-reveal'; axis: 'row' | 'col' }       // defender answers an enemy Sonar with a true line
  | { kind: 'torpedo'; target: Cell }
  | { kind: 'surface' }
  | { kind: 'resign' };

/** Messages sent across the DataChannel between peers. */
export type WireMessage =
  | { t: 'placed' }
  | { t: 'move'; dir: Direction }
  | { t: 'silence' }
  | { t: 'sonar-req'; nonce: number }
  | { t: 'sonar-res'; nonce: number; axis: 'row' | 'col'; value: number }  // defender's true row/col
  | { t: 'torpedo'; target: Cell; nonce: number }
  | { t: 'torpedo-res'; nonce: number; hit: boolean; hitCell: Cell | null; defenderHp: number }
  | { t: 'surface'; sector: SectorId; cell: Cell }
  | { t: 'resign' }
  | { t: 'rematch'; seed: number };   // start a new round on a fresh map (both peers reset to placement)
