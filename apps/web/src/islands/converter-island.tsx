import { type ConverterUnits, converterUnits, pickUnitPair } from '@equreka/core/converter';
import { engineMessage, type Locale, t } from '@equreka/core/i18n';
import type { EngineError } from '@equreka/engine';
import { formatSigFigs } from '@equreka/engine/format';
import { createUnitRegistry, type UnitRegistry } from '@equreka/engine/units';
import { useEffect, useId, useMemo, useState } from 'react';
import { Icon } from '../components/react-icon';
import type { ConverterPayload } from '../integrations/equreka-assets';
import { converterSliceOf } from '../lib/converter-slice';
import { chevronRightIcon } from '../lib/icons';

export interface ConverterIslandProps {
	initialMagnitude?: string;
	initialFrom?: string;
	locale?: Locale;
}

type PayloadState =
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; payload: ConverterPayload };

function sortedMagnitudes(payload: ConverterPayload): [string, { name: string }][] {
	return Object.entries(payload.magnitudes).sort(([, a], [, b]) => a.name.localeCompare(b.name));
}

function unitsFor(
	registry: UnitRegistry,
	magnitudeSlug: string,
	showAllDimension: boolean,
): ConverterUnits {
	const scoped = converterUnits(registry, magnitudeSlug, showAllDimension);
	return {
		...scoped,
		units: [...scoped.units].sort((a, b) => a.name.en.localeCompare(b.name.en)),
	};
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
	const [showAllDimension, setShowAllDimension] = useState(false);
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
		() => (state.status === 'ready' ? createUnitRegistry(converterSliceOf(state.payload)) : null),
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
		const byKind = unitsFor(registry, selected, false).units;
		const byDimension = unitsFor(registry, selected, true).units;
		const offers = (units: readonly { slug: string }[]): boolean =>
			units.some((unit) => unit.slug === initialFrom);
		const widen = !offers(byKind) && offers(byDimension);
		const units = widen ? byDimension : byKind;
		const pair = pickUnitPair(units, payload.magnitudes[selected]?.baseUnit ?? '', {
			from: initialFrom,
		});
		setMagnitude(selected);
		setShowAllDimension(widen);
		setFromUnit(pair.from);
		setToUnit(pair.to);
	}, [state, registry, initialMagnitude, initialFrom]);

	if (state.status === 'loading') {
		return (
			<div className="eq-card">
				<div className="eq-tool-result">
					<p className="eq-tool-message">{t(locale, 'converter.loading')}</p>
				</div>
			</div>
		);
	}
	if (state.status === 'error' || registry === null) {
		return (
			<div className="eq-card">
				<div className="eq-tool-result">
					<p role="alert" className="eq-tool-error">
						{t(locale, 'converter.loadError')}
					</p>
				</div>
			</div>
		);
	}

	const { payload } = state;
	const magnitudes = sortedMagnitudes(payload);
	const { units, hiddenByKind } =
		magnitude === ''
			? { units: [], hiddenByKind: 0 }
			: unitsFor(registry, magnitude, showAllDimension);
	const baseUnitOf = (slug: string): string => payload.magnitudes[slug]?.baseUnit ?? '';

	const selectMagnitude = (slug: string) => {
		const pair = pickUnitPair(unitsFor(registry, slug, false).units, baseUnitOf(slug));
		setMagnitude(slug);
		setShowAllDimension(false);
		setFromUnit(pair.from);
		setToUnit(pair.to);
	};

	const toggleScope = (next: boolean) => {
		const pair = pickUnitPair(unitsFor(registry, magnitude, next).units, baseUnitOf(magnitude), {
			from: fromUnit,
			to: toUnit,
		});
		setShowAllDimension(next);
		setFromUnit(pair.from);
		setToUnit(pair.to);
	};

	const trimmed = rawValue.trim();
	const conversion =
		trimmed === '' || fromUnit === '' || toUnit === ''
			? null
			: registry.convert(Number(trimmed), fromUnit, toUnit);
	const exact = conversion?.ok === true && registry.isExactPath(fromUnit, toUnit);
	const toSymbol = payload.units[toUnit]?.symbolText ?? '';
	const fromSymbol = payload.units[fromUnit]?.symbolText ?? '';

	return (
		<div className="eq-tool type-units">
			<div className="eq-card eq-card-accent">
				<div className="eq-tool-result" aria-live="polite">
					{conversion === null ? (
						<p className="eq-tool-message">{t(locale, 'converter.enterValue')}</p>
					) : conversion.ok ? (
						<>
							<p className="eq-tool-value">
								<span>{rawValue.trim()}</span>
								<span className="eq-tool-unit">{fromSymbol}</span>
								<span>{exact ? '=' : '≈'}</span>
								<strong>{formatSigFigs(conversion.value)}</strong>
								<span className="eq-tool-unit">{toSymbol}</span>
							</p>
							{exact ? null : <p className="eq-tool-note">{t(locale, 'common.sigFigs')}</p>}
						</>
					) : (
						<p role="alert" className="eq-tool-error">
							{errorMessage(conversion.error)}
						</p>
					)}
				</div>
			</div>
			<div className="eq-card eq-tool-form">
				<div className="eq-card-body">
					<div className="eq-tool-fields">
						<div className="eq-tool-wide">
							<div className="eq-field">
								<label htmlFor={`${fieldId}-magnitude`} className="eq-field-caption">
									{t(locale, 'unit.magnitude')}
								</label>
								<div className="eq-field-row">
									<select
										id={`${fieldId}-magnitude`}
										className="eq-field-control"
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
							</div>
							{hiddenByKind > 0 ? (
								<div className="eq-tool-scope">
									<label>
										<input
											type="checkbox"
											checked={showAllDimension}
											aria-describedby={`${fieldId}-scope-hint`}
											onChange={(event) => toggleScope(event.target.checked)}
										/>
										{t(locale, 'converter.showAllDimension', { count: hiddenByKind })}
									</label>
									<p id={`${fieldId}-scope-hint`}>{t(locale, 'converter.showAllDimensionHint')}</p>
								</div>
							) : null}
						</div>
						<div className="eq-field">
							<label htmlFor={`${fieldId}-from`} className="eq-field-caption">
								{t(locale, 'converter.from')}
							</label>
							<div className="eq-field-row">
								<select
									id={`${fieldId}-from`}
									className="eq-field-control"
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
						</div>
						<Icon icon={chevronRightIcon} className="eq-tool-separator" />
						<div className="eq-field">
							<label htmlFor={`${fieldId}-to`} className="eq-field-caption">
								{t(locale, 'converter.to')}
							</label>
							<div className="eq-field-row">
								<select
									id={`${fieldId}-to`}
									className="eq-field-control"
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
						</div>
						<div className="eq-field eq-tool-wide">
							<label htmlFor={`${fieldId}-value`} className="eq-field-caption">
								{t(locale, 'table.value')}
							</label>
							<div className="eq-field-row">
								<input
									id={`${fieldId}-value`}
									className="eq-field-control"
									type="text"
									inputMode="decimal"
									value={rawValue}
									onChange={(event) => setRawValue(event.target.value)}
								/>
							</div>
						</div>
					</div>
					<div className="eq-tool-actions">
						<button
							type="button"
							className="eq-btn eq-btn-dark eq-btn-pill px-6"
							onClick={() => {
								setFromUnit(toUnit);
								setToUnit(fromUnit);
							}}
						>
							{t(locale, 'converter.swap')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
