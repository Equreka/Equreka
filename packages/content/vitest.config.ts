import { createVitestConfig } from '@equreka/config/vitest';

/**
 * The real-corpus tests load, validate and compile every content file, and
 * the corpus grows with each content wave; under a parallel turbo run or a
 * cold CI runner they passed Vitest's 5 s default while taking about 2 s
 * alone.
 */
export default createVitestConfig({ testTimeout: 30_000 });
