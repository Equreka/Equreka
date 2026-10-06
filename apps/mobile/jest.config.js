/**
 * jest-expo transforms Expo/RN packages and the symlinked workspace sources
 * (they resolve outside node_modules); the `.js` → extensionless mapper
 * mirrors metro.config's TypeScript-sibling rewrite for the workspace
 * packages' Node-ESM-style relative imports. MathJax's `#default-font`
 * subpath import targets the font's ESM build; jest's CommonJS graph takes
 * the CJS twin so the output jax and the font share one module instance.
 */
module.exports = {
	preset: 'jest-expo',
	testMatch: ['<rootDir>/__tests__/**/*.test.ts', '<rootDir>/__tests__/**/*.test.tsx'],
	setupFiles: ['@shopify/flash-list/jestSetup'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
		'^#default-font/(.*)$': '<rootDir>/node_modules/@mathjax/mathjax-newcm-font/cjs/$1',
	},
};
