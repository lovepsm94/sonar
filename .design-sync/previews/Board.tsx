import { Board } from 'sonar';
import { playingState, noop } from '../fixtures';

// The submarine grid mid-match: own sub glyph + trail, island terrain, sweep.
export const Idle = () => <Board state={playingState()} />;

// Torpedo-targeting mode highlights candidate cells in range.
export const TorpedoAiming = () => (
  <Board
    state={playingState()}
    mode="torpedo"
    highlight={[
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 4, y: 6 },
    ]}
    selected={{ x: 6, y: 5 }}
    onCellClick={noop}
  />
);
