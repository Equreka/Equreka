import { engineMessage, type Locale, t } from '@equreka/core/i18n';
import type { EngineError } from '@equreka/engine';
import { formatSigFigs } from '@equreka/engine/format';
import { createUnitRegistry, type UnitRegistry } from '@equreka/engine/units';
import type { CompiledDimension, CompiledUnit, EngineSlice } from '@equreka/schema';
import { useEffect, useId, useMemo, useState } from 'react';
import type { ConverterPayload } from '../integrations/equreka-assets';

export interface ConverterIslandProps {
	initialMagnitude?: string;
	initialFrom?: string;
	locale?: Locale;
}

type PayloadState =
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; payload: ConverterPayload };

/**
 * Rebuilds an EngineSlice-shaped object from the trimmed client payload so
 * the shared createUnitRegistry runs unchanged in the browser. Fields the
 * registry never reads (TeX, prefixes, constants, equations) are stubs —
 * the full engine.json never ships to the client.
 */
function toEngineSlice(payload: ConverterPayload): EngineSlice {
	const units: EngineSlice['units'] = {};
	for (const [slug, unit] of Object.entries(payload.units)) {
		const compiled: CompiledUnit = {
			slug,
			name: { en: unit.name },
			symbolTex: '',
			symbolText: unit.symbolText,
			magnitudes: [],
			system: 'other',
			dimension: unit.dimension as CompiledDimension,
			factor: unit.factor,
			offset: unit.offset,
			exact: unit.exact,
			affine: unit.affine,
		};
		units[slug] = compiled;
	}
	return {
		schemaVersion: 0,
		contentHash: '',
		magnitudes: {},
		units,
		prefixes: {},
		constants: {},
		equations: {},
	};
}

function sortedMagnitudes(payload: ConverterPayload): [string, { name: string }][] {
	return Object.entries(payload.magnitudes).sort(([, a], [, b]) => a.name.localeCompare(b.name));
}

function compatibleFor(
	registry: UnitRegistry,
	payload: ConverterPayload,
	magnitudeSlug: string,
): CompiledUnit[] {
	const magnitude = payload.magnitudes[magnitudeSlug];
	if (magnitude === undefined) return [];
	return registry
		.compatibleUnits(magnitude.dimension as CompiledDimension)
		.sort((a, b) => a.name.en.localeCompare(b.name.en));
}

export default function ConverterIsland({
	initialMagnitude,
	initialFrom,
	locale = 'en',
}: ConverterIslandProps) {
	const [state, setState] = useState<PayloadState>({ status: 'loading' });
	const [magnitude, setMagnitude] = useState('');
	const [fromUnit, setFromUnit] = useState('');
	const [toUnit, setToUnit] = useState('');
	const [rawValue, setRawValue] = useState('1');
	const fieldId = useId();

	const errorMessage = (error: EngineError): string =>
		error.code === 'inputs/not-a-number'
			? t(locale, 'converter.notANumber')
			: engineMessage(locale, error.code);

	useEffect(() => {
		let cancelled = false;
		fetch(`/data/converter.${locale}.json`)
			.then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.json() as Promise<ConverterPayload>;
			})
			.then((payload) => {
				if (!cancelled) setState({ status: 'ready', payload });
			})
			.catch(() => {
				if (!cancelled) setState({ status: 'error' });
			});
		return () => {
			cancelled = true;
		};
	}, [locale]);

	const registry = useMemo(
		() => (state.status === 'ready' ? createUnitRegistry(toEngineSlice(state.payload)) : null),
		[state],
	);

	useEffect(() => {
		if (state.status !== 'ready' || registry === null) return;
		const { payload } = state;
		const fromQuery = new URLSearchParams(window.location.search).get('magnitude');
		const requested = initialMagnitude ?? fromQuery ?? undefined;
		const first = sortedMagnitudes(payload)[0];
		const selected =
			requested !== undefined && payload.magnitudes[requested] !== undefined
				? requested
				: (first?.[0] ?? '');
		if (selected === '') return;
		const units = compatibleFor(registry, payload, selected);
		const baseUnit = payload.magnitudes[selected]?.baseUnit ?? '';
		const from =
			initialFrom !== undefined && units.some((unit) => unit.slug === initialFrom)
				? initialFrom
				: units.some((unit) => unit.slug === baseUnit)
					? baseUnit
					: (units[0]?.slug ?? '');
		const to = units.find((unit) => unit.slug !== from)?.slug ?? from;
		setMagnitude(selected);
		setFromUnit(from);
		setToUnit(to);
	}, [state, registry, initialMagnitude, initialFrom]);

	if (state.status === 'loading') {
		return <p className="text-ink-muted">{t(locale, 'converter.loading')}</p>;
	}
	if (state.status === 'error' || registry === null) {
		return <p role="alert">{t(locale, 'converter.loadError')}</p>;
	}

	const { payload } = state;
	const magnitudes = sortedMagnitudes(payload);
	const units = magnitude === '' ? [] : compatibleFor(registry, payload, magnitude);

	const selectMagnitude = (slug: string) => {
		const nextUnits = compatibleFor(registry, payload, slug);
		const base = payload.magnitudes[slug]?.baseUnit ?? '';
		const from = nextUnits.some((unit) => unit.slug === base) ? base : (nextUnits[0]?.slug ?? '');
		setMagnitude(slug);
		setFromUnit(from);
		setToUnit(nextUnits.find((unit) => unit.slug !== from)?.slug ?? from);
	};

	const trimmed = rawValue.trim();
	const conversion =
		trimmed === '' || fromUnit === '' || toUnit === ''
			? null
			: registry.convert(Number(trimmed), fromUnit, toUnit);
	const exact = conversion?.ok === true && registry.isExactPath(fromUnit, toUnit);
	const toSymbol = payload.units[toUnit]?.symbolText ?? '';
	const fromSymbol = payload.units[fromUnit]?.symbolText ?? '';

	const selectClass =
		'w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-ink';

	return (
		<div className="rounded-lg border border-border bg-surface p-6">
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="sm:col-span-2">
					<label
						htmlFor={`${fieldId}-magnitude`}
						className="mb-1 block text-sm font-medium text-ink-muted"
					>
						{t(locale, 'unit.magnitude')}
					</label>
					<select
						id={`${fieldId}-magnitude`}
						className={selectClass}
						value={magnitude}
						onChange={(event) => selectMagnitude(event.target.value)}
					>
						{magnitudes.map(([slug, entry]) => (
							<option key={slug} value={slug}>
								{entry.name}
							</option>
						))}
					</select>
				</div>
				<div>
					<label
						htmlFor={`${fieldId}-from`}
						className="mb-1 block text-sm font-medium text-ink-muted"
					>
						{t(locale, 'converter.from')}
					</label>
					<select
						id={`${fieldId}-from`}
						className={selectClass}
						value={fromUnit}
						onChange={(event) => setFromUnit(event.target.value)}
					>
						{units.map((unit) => (
							<option key={unit.slug} value={unit.slug}>
								{unit.name.en} ({unit.symbolText})
							</option>
						))}
					</select>
				</div>
				<div>
					<label
						htmlFor={`${fieldId}-to`}
						className="mb-1 block text-sm font-medium text-ink-muted"
					>
						{t(locale, 'converter.to')}
					</label>
					<select
						id={`${fieldId}-to`}
						className={selectClass}
						value={toUnit}
						onChange={(event) => setToUnit(event.target.value)}
					>
						{units.map((unit) => (
							<option key={unit.slug} value={unit.slug}>
								{unit.name.en} ({unit.symbolText})
							</option>
						))}
					</select>
				</div>
				<div>
					<label
						htmlFor={`${fieldId}-value`}
						className="mb-1 block text-sm font-medium text-ink-muted"
					>
						{t(locale, 'table.value')}
					</label>
					<input
						id={`${fieldId}-value`}
						className={selectClass}
						type="text"
						inputMode="decimal"
						value={rawValue}
						onChange={(event) => setRawValue(event.target.value)}
					/>
				</div>
				<div className="flex items-end">
					<button
						type="button"
						className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg"
						onClick={() => {
							setFromUnit(toUnit);
							setToUnit(fromUnit);
						}}
					>
						{t(locale, 'converter.swap')}
					</button>
				</div>
			</div>
			<div className="mt-6 border-t border-border pt-4" aria-live="polite">
				{conversion === null ? (
					<p className="text-ink-muted">{t(locale, 'converter.enterValue')}</p>
				) : conversion.ok ? (
					<p className="text-xl">
						{rawValue.trim()} {fromSymbol} {exact ? '=' : '≈'}{' '}
						<strong>{formatSigFigs(conversion.value)}</strong> {toSymbol}
						{exact ? null : (
							<span className="ml-2 text-sm text-ink-muted">{t(locale, 'common.sigFigs')}</span>
						)}
					</p>
				) : (
					<p role="alert" className="text-danger">
						{errorMessage(conversion.error)}
					</p>
				)}
			</div>
		</div>
	);
}
