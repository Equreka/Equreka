import { formatSigFigs } from '@equreka/engine/format';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { getSummary } from '../../entities/content/lookup';
import { formatFullPrecision } from '../../entities/content/notation';
import { entryHref } from '../../entities/content/routes';
import type { PresentationConstant } from '../../entities/content/types';
import { useLocale, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Row } from '../../shared/ui/card';
import { VStack } from '../../shared/ui/screen';
import { AppText, Muted, SectionTitle } from '../../shared/ui/text';

export interface ConstantDetailsProps {
	constant: PresentationConstant;
}

/**
 * Six-figure display beside the unit symbol, then the decimal string from
 * content at full precision — the value never passes through float64
 * before the reader sees it — ending in an ellipsis when it is truncated.
 */
export function ConstantDetails({ constant }: ConstantDetailsProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const unit = getSummary('units', constant.unit, locale);
	const unitSymbol = unit?.symbolText ?? '';
	return (
		<>
			<VStack>
				<SectionTitle>{t('constant.value')}</SectionTitle>
				<AppText size="xl" mono>
					{constant.symbolText} = {formatSigFigs(Number(constant.value))}
					{unitSymbol === '' ? '' : ` ${unitSymbol}`}
				</AppText>
				<Muted>{t('common.sigFigs')}</Muted>
			</VStack>
			<VStack>
				<SectionTitle>{t('constant.fullPrecision')}</SectionTitle>
				<AppText mono>
					{formatFullPrecision(constant.value, constant.truncated)}
					{unitSymbol === '' ? '' : ` ${unitSymbol}`}
				</AppText>
				{constant.uncertainty === undefined ? null : (
					<Muted>± {formatFullPrecision(constant.uncertainty)}</Muted>
				)}
				<Muted>{t(constant.exact ? 'constant.statusExact' : 'constant.statusMeasured')}</Muted>
				{constant.source === undefined ? null : (
					<Muted>
						{t('constant.source')} {constant.source.name}
					</Muted>
				)}
			</VStack>
			{unit === undefined ? null : (
				<VStack>
					<SectionTitle>{t('table.unit')}</SectionTitle>
					<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
						<Row
							title={unit.name}
							subtitle={unit.symbolText}
							onPress={() => router.push(entryHref('units', unit.slug))}
						/>
					</View>
				</VStack>
			)}
		</>
	);
}
