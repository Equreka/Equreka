import { createVitestConfig } from '@equreka/config/vitest';

/**
 * Unit tests only (src/): the Playwright suite in e2e/ matches vitest's
 * default spec glob and must never run under `pnpm test` (ADR 0002 keeps
 * the offline E2E on its own test:e2e lane).
 */
export default createVitestConfig();
