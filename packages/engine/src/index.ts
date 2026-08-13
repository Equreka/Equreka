/**
 * Platform-free math engine: dimensional unit conversion (float64 runtime),
 * codegen'd equation solutions, constants, display formatting. Zero I/O and
 * zero React — runs identically in browser, Hermes, and Node.
 */
export const ENGINE_VERSION = 1;

export * from './constants/index.js';
export * from './errors.js';
export * from './format/index.js';
export * from './solutions/index.js';
export * from './units/index.js';
