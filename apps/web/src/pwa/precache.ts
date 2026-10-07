import { BUDGET_WARN_RATIO } from '@equreka/content/artifact-budgets';

/**
 * The locale-neutral shell (ADR 0002, ADR 0013): app-shell routes of both
 * locale trees, island bundles, KaTeX, the Poppins display faces, the icon
 * font and the header logo. Deliberately not a catch-all HTML glob: entry
 * pages are runtime-cached, so a chunk change never invalidates all of them,
 * and never-visited entries resolve through the offline reader. The locale
 * payloads are absent on purpose: the data cache holds the reader's locale.
 */
export const SHELL_PRECACHE_GLOBS = [
	'{,es/}index.html',
	'{,es/}offline/index.html',
	'{,es/}converter/index.html',
	'{,es/}search/index.html',
	'{,es/}favorites/index.html',
	'{,es/}settings/index.html',
	'{,es/}paths/index.html',
	'_astro/*.js',
	'_astro/*.css',
	'katex/katex.min.css',
	'katex/fonts/*.woff2',
	'fonts/*.woff2',
	'manifest.webmanifest',
	'icons/*.svg',
	'brand/logo.svg',
	'pwa-register.js',
] as const;

/**
 * Ceiling on what a first install stores: the shell plus one locale's data.
 */
export const OFFLINE_BUDGET_BYTES = 6 * 1024 * 1024;

export interface OfflineInstallAccount {
	shellBytes: number;
	localeBytes: Readonly<Record<string, number>>;
	largestLocale: string;
	totalBytes: number;
}

/**
 * A reader installs the shell and the data of the locale they browse, so
 * the budget holds the shell plus the largest locale's payloads.
 */
export function accountOfflineInstall(
	shellBytes: number,
	localeBytes: Readonly<Record<string, number>>,
): OfflineInstallAccount {
	let largestLocale = '';
	let largestBytes = 0;
	for (const [locale, bytes] of Object.entries(localeBytes)) {
		if (largestLocale === '' || bytes > largestBytes) {
			largestLocale = locale;
			largestBytes = bytes;
		}
	}
	return { shellBytes, localeBytes, largestLocale, totalBytes: shellBytes + largestBytes };
}

export type BudgetVerdict = 'within' | 'warn' | 'over';

export function budgetVerdict(
	bytes: number,
	budgetBytes: number = OFFLINE_BUDGET_BYTES,
	warnRatio: number = BUDGET_WARN_RATIO,
): BudgetVerdict {
	if (bytes > budgetBytes) return 'over';
	return bytes >= budgetBytes * warnRatio ? 'warn' : 'within';
}

function kib(bytes: number): string {
	return `${(bytes / 1024).toFixed(1)} KiB`;
}

export function describeOfflineInstall(
	account: OfflineInstallAccount,
	shellUrls: number,
	budgetBytes: number = OFFLINE_BUDGET_BYTES,
): string {
	const locales = Object.entries(account.localeBytes)
		.map(([locale, bytes]) => `${locale} ${kib(bytes)}`)
		.join(', ');
	const share = ((account.totalBytes / budgetBytes) * 100).toFixed(1);
	return `offline install: shell ${shellUrls} URLs ${kib(account.shellBytes)} + largest locale data (${account.largestLocale}) = ${kib(account.totalBytes)} of ${kib(budgetBytes)} (${share}%); locale data: ${locales}`;
}
