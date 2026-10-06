import rootPackage from '../../../../package.json';
import type { IconName } from './icons';

/**
 * App version surfaced in the settings page — the monorepo version from
 * the root package.json, resolved at build.
 */
export const SITE_VERSION: string = rootPackage.version;

export const GITHUB_URL = 'https://github.com/Equreka/Equreka';

/**
 * The legacy footer's social row, in its order and with its destinations
 * (the original app's `WebFooter.vue`); `icon` doubles as the per-network
 * hover-color class suffix.
 */
export const SOCIAL_LINKS: readonly {
	key: 'footer.github' | 'footer.facebook' | 'footer.twitter' | 'footer.discord';
	href: string;
	icon: IconName;
}[] = [
	{ key: 'footer.github', href: GITHUB_URL, icon: 'github' },
	{ key: 'footer.facebook', href: 'https://fb.me/Equreka', icon: 'facebook' },
	{ key: 'footer.twitter', href: 'https://twitter.com/Equreka', icon: 'twitter' },
	{ key: 'footer.discord', href: 'https://discord.gg/NZypuxvAB6', icon: 'discord' },
];
