import { NoticeScreen } from 'sonar';
import { noop } from '../fixtures';

export const ConnLost = () => (
  <NoticeScreen reason="conn-lost" onHome={noop} onRetry={noop} />
);

export const Timeout = () => <NoticeScreen reason="timeout" onHome={noop} onRetry={noop} />;

export const HandshakeFailed = () => (
  <NoticeScreen reason="handshake-failed" onHome={noop} />
);
