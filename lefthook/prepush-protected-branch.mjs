import { execFileSync } from 'node:child_process';

/**
 * Blocks direct pushes to protected branches. PRs are the only path to main;
 * archive/* is immutable history. Escape hatch: LEFTHOOK=0 git push (audited
 * by convention, not tooling — this is a solo/small-team guard, not security).
 */
const PROTECTED = ['main', 'archive/nuxt2'];

const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
	encoding: 'utf8',
}).trim();

if (PROTECTED.includes(branch)) {
	console.error(`pre-push: direct push to protected branch "${branch}" blocked. Open a PR.`);
	process.exit(1);
}
