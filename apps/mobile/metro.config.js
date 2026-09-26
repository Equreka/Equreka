const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

/**
 * pnpm-monorepo Metro config: the workspace root joins the watch folders
 * and node_modules lookup paths so symlinked @equreka/* packages and their
 * hoisted-by-pnpm dependencies resolve; inlineRequires keeps the bundled
 * per-collection JSON modules lazy under Hermes (ADR 0002).
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/**
 * Workspace TypeScript sources import siblings with an explicit `.js`
 * extension (Node ESM convention); Metro tries the literal path and then
 * `x.js.<ext>`, never `x.ts`, so the rewrite happens here.
 */
const TS_EXTENSIONS = ['.ts', '.tsx'];

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...new Set([...(config.watchFolders ?? []), workspaceRoot])];
config.resolver.nodeModulesPaths = [
	...new Set([
		path.join(projectRoot, 'node_modules'),
		path.join(workspaceRoot, 'node_modules'),
		...(config.resolver.nodeModulesPaths ?? []),
	]),
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
	try {
		return context.resolveRequest(context, moduleName, platform);
	} catch (error) {
		if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
			const stem = moduleName.slice(0, -3);
			for (const extension of TS_EXTENSIONS) {
				try {
					return context.resolveRequest(context, `${stem}${extension}`, platform);
				} catch {}
			}
		}
		throw error;
	}
};

const defaultGetTransformOptions = config.transformer.getTransformOptions;
config.transformer.getTransformOptions = async (...args) => {
	const options = (await defaultGetTransformOptions?.(...args)) ?? {};
	return {
		...options,
		transform: { ...options.transform, experimentalImportSupport: true, inlineRequires: true },
	};
};

module.exports = config;
