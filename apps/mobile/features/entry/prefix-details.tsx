import { toSuperscript } from '@equreka/engine/format';
import { formatFullPrecision, powerOfTenExponent } from '../../entities/content/notation';
import type { PresentationPrefix } from '../../entities/content/types';
import { useT } from '../../shared/providers/equreka-provider';
import { VStack } from '../../shared/ui/screen';
import { AppText, Muted, SectionTitle } from '../../shared/ui/text';

export interface PrefixDetailsProps {
	prefix: PresentationPrefix;
}

export function PrefixDetails({ prefix }: PrefixDetailsProps) {
	const t = useT();
	const exponent = powerOfTenExponent(prefix.value);
	return (
		<VStack>
			<SectionTitle>{t('table.value')}</SectionTitle>
			<AppText size="xl" mono>
				{exponent === null ? formatFullPrecision(prefix.value) : `10${toSuperscript(exponent)}`}
			</AppText>
			{exponent === null ? null : <Muted>{formatFullPrecision(prefix.value)}</Muted>}
			<Muted>
				{t(exponent !== null && exponent < 0 ? 'prefixes.submultiples' : 'prefixes.multiples')}
			</Muted>
		</VStack>
	);
}
