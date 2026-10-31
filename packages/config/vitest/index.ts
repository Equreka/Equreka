import type { ViteUserConfig } from 'vitest/config';

/**
 * Node 25 and later define a global `localStorage` that stays undefined
 * without --localstorage-file. The jsdom environment keeps globals that
 * already exist, so tests then read Node's undefined storage instead of
 * jsdom's. Workers switch Node's Web Storage off wherever the runtime has
 * it; older runtimes, where the flag may not exist, get no flag.
 */
const NODE_WEB_STORAGE_OFF: string[] =
	'localStorage' in globalThis ? ['--no-experimental-webstorage'] : [];

/**
 * Shared Vitest defaults for workspace packages. Apps and packages call
 * createVitestConfig and spread overrides rather than duplicating config.
 */
export function createVitestConfig(
	overrides: NonNullable<ViteUserConfig['test']> = {},
): ViteUserConfig {
	return {
		test: {
			globals: false,
			include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
			execArgv: NODE_WEB_STORAGE_OFF,
			...overrides,
		},
	};
}
