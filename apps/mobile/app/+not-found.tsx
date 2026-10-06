import { useRouter } from 'expo-router';
import { useT } from '../shared/providers/equreka-provider';
import { Button } from '../shared/ui/button';
import { Screen, VStack } from '../shared/ui/screen';
import { Lead, Title } from '../shared/ui/text';

export default function NotFoundScreen() {
	const t = useT();
	const router = useRouter();
	return (
		<Screen>
			<VStack>
				<Title>{t('mobile.notFound.title')}</Title>
				<Lead>{t('mobile.notFound.lead')}</Lead>
			</VStack>
			<Button
				label={t('mobile.notFound.home')}
				variant="primary"
				onPress={() => router.replace('/')}
			/>
		</Screen>
	);
}
