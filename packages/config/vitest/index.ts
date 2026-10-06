import type { ViteUserConfig } from 'vitest/config';

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
			...overrides,
		},
	};
}
