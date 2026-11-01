import type { Element, Quantity, StateOfMatter } from '@equreka/schema';
import { electronCount, parseElectronConfiguration } from '../periodic-table.js';
import { dimensionsEqual, formatDimension, magnitudeDimension } from './dimension.js';
import { type Rat, ratAdd, ratCompare, ratFromDecimal, ratMul } from './rational.js';
import type { ResolvedUnit } from './resolve.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

/**
 * The magnitude whose dimension each element quantity's unit must carry.
 */
const PROPERTY_MAGNITUDES = {
	covalentRadius: 'length',
	density: 'density',
	meltingPoint: 'thermodynamic-temperature',
	boilingPoint: 'thermodynamic-temperature',
} as const satisfies Partial<Record<keyof Element, string>>;

const IONIZATION_MAGNITUDE = 'energy';

/**
 * Standard ambient temperature in kelvin, at which `standardState` is
 * judged against the melting and boiling points.
 */
const STANDARD_TEMPERATURE_K = ratFromDecimal('298.15');

/**
 * The state the melting and boiling points imply at `temperature`, or
 * undefined when the points the element has do not decide it: a substance
 * that sublimes has neither, and a melting point below `temperature` says
 * nothing without the boiling point.
 */
function impliedState(temperature: Rat, melting?: Rat, boiling?: Rat): StateOfMatter | undefined {
	if (boiling !== undefined && ratCompare(boiling, temperature) <= 0) {
		return 'gas';
	}
	if (melting !== undefined && ratCompare(melting, temperature) > 0) {
		return 'solid';
	}
	if (melting !== undefined && boiling !== undefined) {
		return 'liquid';
	}
	return undefined;
}

function ionizationOrder(a: string, b: string): number {
	return Number(a) - Number(b);
}

/**
 * Stage `elements` (ADR 0016): what no single element file can show on its
 * own. Atomic numbers and symbols are unique across the collection; the
 * electron configuration parses and holds `atomicNumber` electrons; an
 * atomic-weight interval has its low bound below its high one; every
 * quantity's unit exists, converts, and has its property's dimension;
 * ionization energies stop at `atomicNumber` and rise with n; the boiling
 * point exceeds the melting point; and the standard state agrees with
 * both at 298.15 K. Comparisons run on exact rationals in SI base units,
 * so a property authored in °C or eV compares like one in K or J.
 */
export function checkElements(
	corpus: Corpus,
	resolved: ReadonlyMap<string, ResolvedUnit>,
): Issue[] {
	const issues: Issue[] = [];
	const slugsByNumber = new Map<number, string[]>();
	const slugsBySymbol = new Map<string, string[]>();

	const inBaseUnits = (
		file: string,
		path: string,
		quantity: Quantity,
		magnitudeSlug: string,
	): Rat | undefined => {
		const fail = (message: string): undefined => {
			issues.push(issue('error', 'elements', file, `${path}.unit: ${message}`));
			return undefined;
		};
		if (!corpus.units.has(quantity.unit)) {
			return fail(`unknown units ref '${quantity.unit}'`);
		}
		const unit = resolved.get(quantity.unit);
		if (unit === undefined) {
			return fail(`'${quantity.unit}' has no conversion to base units`);
		}
		const magnitude = corpus.magnitudes.get(magnitudeSlug);
		if (magnitude === undefined) {
			return fail(`the property's magnitude '${magnitudeSlug}' is missing from the corpus`);
		}
		const expected = magnitudeDimension(magnitude);
		if (!dimensionsEqual(unit.dimension, expected)) {
			return fail(
				`'${quantity.unit}' has dimension ${formatDimension(unit.dimension)}, not ${formatDimension(expected)} (${magnitudeSlug})`,
			);
		}
		return ratAdd(ratMul(ratFromDecimal(quantity.value), unit.factor), unit.offset);
	};

	for (const [slug, element] of [...corpus.elements].sort(([a], [b]) => (a < b ? -1 : 1))) {
		const file = fileOf('elements', slug);
		const error = (message: string): void => {
			issues.push(issue('error', 'elements', file, message));
		};
		const z = element.atomicNumber;
		slugsByNumber.set(z, [...(slugsByNumber.get(z) ?? []), slug]);
		slugsBySymbol.set(element.symbol.text, [
			...(slugsBySymbol.get(element.symbol.text) ?? []),
			slug,
		]);

		if (element.electronConfiguration !== undefined) {
			const text = element.electronConfiguration.value;
			const parsed = parseElectronConfiguration(text);
			if (!parsed.ok) {
				error(`electronConfiguration.value '${text}': ${parsed.message}`);
			} else {
				const count = electronCount(parsed.configuration);
				if (count !== z) {
					error(
						`electronConfiguration.value '${text}' holds ${count} electrons; atomic number ${z} needs ${z}`,
					);
				}
			}
		}

		const weight = element.atomicWeight;
		if (
			weight.kind === 'interval' &&
			ratCompare(ratFromDecimal(weight.low), ratFromDecimal(weight.high)) >= 0
		) {
			error(`atomicWeight: the interval low ${weight.low} must be below its high ${weight.high}`);
		}

		const energies = Object.entries(element.ionizationEnergies).sort(([a], [b]) =>
			ionizationOrder(a, b),
		);
		let previous: { n: string; energy: Rat } | undefined;
		for (const [n, energy] of energies) {
			if (Number(n) > z) {
				error(`ionizationEnergies.${n}: atomic number ${z} leaves only ${z} electrons to remove`);
			}
			const base = inBaseUnits(file, `ionizationEnergies.${n}`, energy, IONIZATION_MAGNITUDE);
			if (base === undefined) {
				continue;
			}
			if (previous !== undefined && ratCompare(base, previous.energy) <= 0) {
				error(
					`ionizationEnergies.${n}: removing electron ${n} must cost more than removing electron ${previous.n}`,
				);
			}
			previous = { n, energy: base };
		}

		const points: Partial<Record<keyof typeof PROPERTY_MAGNITUDES, Rat>> = {};
		for (const [property, magnitudeSlug] of Object.entries(PROPERTY_MAGNITUDES) as [
			keyof typeof PROPERTY_MAGNITUDES,
			string,
		][]) {
			const quantity = element[property];
			if (quantity === undefined) {
				continue;
			}
			const base = inBaseUnits(file, property, quantity, magnitudeSlug);
			if (base !== undefined) {
				points[property] = base;
			}
		}

		const { meltingPoint, boilingPoint } = points;
		if (
			meltingPoint !== undefined &&
			boilingPoint !== undefined &&
			ratCompare(boilingPoint, meltingPoint) <= 0
		) {
			error('boilingPoint: an element boils above the temperature at which it melts');
		}

		const state = element.standardState?.value;
		const implied = impliedState(STANDARD_TEMPERATURE_K, meltingPoint, boilingPoint);
		if (state !== undefined && implied !== undefined && state !== implied) {
			error(
				`standardState.value: '${state}' contradicts the melting and boiling points, which make the element a ${implied} at 298.15 K`,
			);
		}
	}

	const clashes = (
		bySlug: ReadonlyMap<number | string, readonly string[]>,
		field: string,
	): void => {
		for (const [value, slugs] of bySlug) {
			if (slugs.length < 2) {
				continue;
			}
			for (const slug of slugs) {
				const others = slugs.filter((other) => other !== slug).map((other) => `elements/${other}`);
				issues.push(
					issue(
						'error',
						'elements',
						fileOf('elements', slug),
						`${field}: ${value} is also the ${field} of ${others.join(', ')}`,
					),
				);
			}
		}
	};
	clashes(slugsByNumber, 'atomicNumber');
	clashes(slugsBySymbol, 'symbol');
	return issues;
}
