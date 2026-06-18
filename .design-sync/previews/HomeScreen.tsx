import { HomeScreen } from 'sonar';
import { noop } from '../fixtures';

export const Default = () => <HomeScreen onCreate={noop} onJoinCode={noop} />;

export const WithError = () => (
  <HomeScreen onCreate={noop} onJoinCode={noop} error="Mã không hợp lệ" onClearError={noop} />
);
