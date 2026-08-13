/**
 * CLI entry: `equreka-content build | check`. Wired in P2; the placeholder
 * keeps `turbo run build/check` green while the pipeline lands.
 */
const command = process.argv[2] ?? 'check';
console.log(`@equreka/content ${command}: pipeline lands in P2 (no-op)`);
