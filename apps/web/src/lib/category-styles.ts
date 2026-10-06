/**
 * Category accent utilities as full literal class names — Tailwind's
 * scanner only sees statically written classes, so per-category styling
 * goes through these maps instead of template interpolation.
 */
export const CATEGORY_BORDER: Record<string, string> = {
	universal: 'border-t-universal',
	mathematics: 'border-t-mathematics',
	physics: 'border-t-physics',
	chemistry: 'border-t-chemistry',
};

export const CATEGORY_TEXT: Record<string, string> = {
	universal: 'text-universal',
	mathematics: 'text-mathematics',
	physics: 'text-physics',
	chemistry: 'text-chemistry',
};

export const CATEGORY_BADGE: Record<string, string> = {
	universal: 'bg-universal/10 text-universal',
	mathematics: 'bg-mathematics/10 text-mathematics',
	physics: 'bg-physics/10 text-physics',
	chemistry: 'bg-chemistry/10 text-chemistry',
};
