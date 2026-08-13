import type { Category, Magnitude, Unit } from '@equreka/schema';

/**
 * The shared loader validates every entry against @equreka/schema before it
 * reaches Astro's store, so collections carry no Astro-side schema and
 * entry data narrows through these casts instead of a second Zod pass.
 */
export function asUnit(data: Record<string, unknown>): Unit {
	return data as unknown as Unit;
}

export function asMagnitude(data: Record<string, unknown>): Magnitude {
	return data as unknown as Magnitude;
}

export function asCategory(data: Record<string, unknown>): Category {
	return data as unknown as Category;
}
