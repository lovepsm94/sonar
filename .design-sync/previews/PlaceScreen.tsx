import { PlaceScreen } from 'sonar';
import { placingState, noop } from '../fixtures';

// Deployment phase: tap a water cell to drop the submarine.
export const Default = () => <PlaceScreen state={placingState()} onPlace={noop} />;
