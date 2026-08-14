import { createVitestConfig } from '@equreka/config/vitest';

/**
 * jsdom environment: the hook tests render through @testing-library/react,
 * which needs a DOM. Source stays platform-neutral — react-dom is a
 * test-time dependency only.
 */
export default createVitestConfig({ environment: 'jsdom' });
