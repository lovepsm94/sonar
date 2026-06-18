import { PlayScreen } from 'sonar';
import { playingState, sampleLog, noop } from '../fixtures';

const handlers = {
  onEffectDone: noop,
  onToggleRO: noop,
  onPinCell: noop,
  onReveal: noop,
  onMove: noop,
  onSonar: noop,
  onSilence: noop,
  onTorpedo: noop,
  onSurface: noop,
  onResign: noop,
};

// The main battle HUD on my turn: board, HP pips, energy bar, action grid, log.
export const MyTurn = () => (
  <PlayScreen
    state={playingState()}
    myTurn
    shake={false}
    effects={[]}
    revealSectors={[]}
    log={sampleLog}
    ro={null}
    roOn={false}
    roCount={null}
    {...handlers}
  />
);

// Opponent's turn — board live but the action controls are locked.
export const EnemyTurn = () => (
  <PlayScreen
    state={playingState()}
    myTurn={false}
    shake={false}
    effects={[]}
    revealSectors={[]}
    log={sampleLog}
    ro={null}
    roOn={false}
    roCount={null}
    {...handlers}
  />
);
