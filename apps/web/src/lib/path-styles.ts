/**
 * Level badge utilities as full literal class names (Tailwind's scanner
 * only sees statically written classes). Keyed by the schema's pathLevel.
 */
export const LEVEL_BADGE: Record<string, string> = {
	intro: 'bg-accent/10 text-accent',
	intermediate: 'bg-physics/10 text-physics',
	advanced: 'bg-chemistry/10 text-chemistry',
};
