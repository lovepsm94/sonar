import { ConnectScreen } from 'sonar';
import { noop } from '../fixtures';

// Host flow: a room code is generated into a QR for the guest to scan.
export const Host = () => (
  <ConnectScreen myCode="SONAR-7Q2X" needScan={false} onScanned={noop} />
);

// Guest flow: still waiting for the host's answer (needScan toggles the
// "scan this QR" prompt with the pulsing wait dots).
export const Guest = () => (
  <ConnectScreen myCode={null} needScan onScanned={noop} />
);
