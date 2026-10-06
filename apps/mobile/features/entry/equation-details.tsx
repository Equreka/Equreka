import { canonicalTex } from '@equreka/content/rich-text';
import { localizedName, pickLocalized } from '@equreka/core/i18n';
import type { EquationTerm } from '@equreka/schema';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { type EntrySummary, getSummary } from '../../entities/content/lookup';
import { calculatorHref, entryHref } from '../../entities/content/routes';
import type { EntryCollection, PresentationEquation } from '../../entities/content/types';
import { MathSvg } from '../../shared/math/math-view';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { Row } from '../../shared/ui/card';
import { HStack, VStack } from '../../shared/ui/screen';
import { AppText, SectionTitle } from '../../shared/ui/text';

export interface EquationDetailsProps {
	slug: string;
	equation: PresentationEquation;
}

const TERM_COLLECTIONS: Record<Exclude<EquationTerm['kind'], 'symbol'>, EntryCollection> = {
	magnitude: 'magnitudes',
	constant: 'constants',
	variable: 'variables',
};

interface TermRow {
	key: string;
	tex: string;
	kind: EquationTerm['kind'];
	label: string;
	unitSymbol: string;
	target: EntrySummary | undefined;
}

/**
 * The expression as one display SVG (horizontal pan for wide chains), a
 * term-by-term table whose keys are themselves atlas bodies, the derived
 * related units, and the calculator entry point when the equation is
 * solvable.
 */
export function EquationDetails({ slug, equation }: EquationDetailsProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const terms: TermRow[] = Object.entries(equation.terms).map(([key, term]) => {
		if (term.kind === 'symbol') {
			const unit = term.unit === undefined ? undefined : getSummary('units', term.unit, locale);
			return {
				key,
				tex: canonicalTex(key),
				kind: term.kind,
				label: pickLocalized(term.label, locale).value,
				unitSymbol: unit?.symbolText ?? '',
				target: undefined,
			};
		}
		const target = getSummary(TERM_COLLECTIONS[term.kind], term.ref, locale);
		return {
			key,
			tex: canonicalTex(key),
			kind: term.kind,
			label: target?.name ?? term.ref,
			unitSymbol: '',
			target,
		};
	});
	const openTarget = (target: EntrySummary | undefined): (() => void) | undefined =>
		target === undefined ? undefined : () => router.push(entryHref(target.collection, target.slug));
	const related = equation.relatedUnits
		.map((unitSlug) => getSummary('units', unitSlug, locale))
		.filter((summary) => summary !== undefined);
	return (
		<>
			<MathSvg tex={equation.expressionTex} size="2xl" center scroll />
			{equation.calculator.enabled ? (
				<Button
					label={t('equation.solve')}
					variant="primary"
					onPress={() => router.push(calculatorHref(slug))}
				/>
			) : null}
			<VStack>
				<SectionTitle>{t('equation.terms')}</SectionTitle>
				<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
					{terms.map((term) => (
						<Row
							key={term.key}
							title={term.label}
							detail={`${t(`term.${term.kind}`)}${term.unitSymbol === '' ? '' : ` · ${term.unitSymbol}`}`}
							trailing={
								<HStack gap={1}>
									<MathSvg tex={term.tex} size="lg" />
								</HStack>
							}
							onPress={openTarget(term.target)}
						/>
					))}
				</View>
			</VStack>
			{related.length === 0 ? null : (
				<VStack>
					<SectionTitle>{t('equation.relatedUnits')}</SectionTitle>
					<View style={[styles.rounded, { borderRadius: theme.radius.md }]}>
						{related.map((unit) => (
							<Row
								key={unit.slug}
								title={unit.name}
								subtitle={unit.symbolText}
								onPress={() => router.push(entryHref('units', unit.slug))}
							/>
						))}
					</View>
				</VStack>
			)}
			<AppText size="sm" tone="muted">
				{localizedName(equation, locale)} · {t(`kind.${equation.kind}`)}
			</AppText>
		</>
	);
}

const styles = StyleSheet.create({
	rounded: { overflow: 'hidden' },
});
