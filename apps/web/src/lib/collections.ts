import type {
	Category,
	Constant,
	Equation,
	Magnitude,
	Path,
	Prefix,
	Unit,
	Variable,
} from '@equreka/schema';

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

export function asConstant(data: Record<string, unknown>): Constant {
	return data as unknown as Constant;
}

export function asPrefix(data: Record<string, unknown>): Prefix {
	return data as unknown as Prefix;
}

export function asVariable(data: Record<string, unknown>): Variable {
	return data as unknown as Variable;
}

export function asEquation(data: Record<string, unknown>): Equation {
	return data as unknown as Equation;
}

export function asPath(data: Record<string, unknown>): Path {
	return data as unknown as Path;
}
