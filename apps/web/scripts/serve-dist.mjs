import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Dependency-free static server for dist/ with directory-index semantics
 * matching Astro's default "directory" build format: trailing-slash paths
 * serve their index.html, extensionless paths that name a directory
 * redirect to the trailing-slash form, everything else is a plain file or
 * a 404. Used by the Playwright offline E2E instead of `astro preview`,
 * which daemonizes and cannot be torn down reliably on Windows. An
 * optional second argument serves another directory with the same
 * semantics (the design-parity harness serves a frozen snapshot).
 */
const distDir =
	process.argv[3] === undefined
		? fileURLToPath(new URL('../dist/', import.meta.url))
		: resolve(process.argv[3]);
const port = Number(process.argv[2] ?? '43210');

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.webmanifest': 'application/manifest+json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8',
};

const server = createServer((request, response) => {
	const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
	const pathname = decodeURIComponent(url.pathname);
	const safePath = normalize(pathname).replaceAll('\\', '/');
	if (safePath.includes('..')) {
		response.writeHead(400, { 'content-type': 'text/plain' });
		response.end('bad request');
		return;
	}
	let filePath = join(distDir, safePath);
	if (safePath.endsWith('/')) {
		filePath = join(filePath, 'index.html');
	} else if (existsSync(filePath) && statSync(filePath).isDirectory()) {
		response.writeHead(301, { location: `${pathname}/` });
		response.end();
		return;
	}
	if (!existsSync(filePath) || !statSync(filePath).isFile()) {
		response.writeHead(404, { 'content-type': 'text/plain' });
		response.end('not found');
		return;
	}
	response.writeHead(200, {
		'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
	});
	createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
	console.log(`serve-dist: http://127.0.0.1:${port} ← ${distDir}`);
});
