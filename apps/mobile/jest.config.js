/**
 * jest-expo transforms Expo/RN packages and the symlinked workspace sources
 * (they resolve outside node_modules); the `.js` → extensionless mapper
 * mirrors metro.config's TypeScript-sibling rewrite for the workspace
 * packages' Node-ESM-style relative imports. MathJax's `#default-font`
 * subpath import targets the font's ESM build; jest's CommonJS graph takes
 * the CJS twin so the output jax and the font share one module instance.
 * Tests are located through `roots`, not a `<rootDir>` glob: a checkout
 * path such as a `.claude` worktree turns into glob syntax and matches
 * nothing. The first test of a suite pays the cold transform of React
 * Native and the load of the content artifact, which grows with every
 * content wave; on a cold CI runner that alone passed Jest's 5 s default.
 */
module.exports = {
	preset: 'jest-expo',
	roots: ['<rootDir>/__tests__'],
	testMatch: ['**/*.test.ts', '**/*.test.tsx'],
	testTimeout: 30_000,
	setupFiles: ['@shopify/flash-list/jestSetup'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
		'^#default-font/(.*)$': '<rootDir>/node_modules/@mathjax/mathjax-newcm-font/cjs/$1',
	},
};
