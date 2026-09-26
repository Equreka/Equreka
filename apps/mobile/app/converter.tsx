import { useLocalSearchParams } from 'expo-router';
import { ConverterScreen } from '../features/converter/converter-screen';
import { firstParam } from '../shared/navigation/params';

export default function ConverterRoute() {
	const params = useLocalSearchParams<{ magnitude?: string; from?: string }>();
	return (
		<ConverterScreen
			initialMagnitude={firstParam(params.magnitude)}
			initialFrom={firstParam(params.from)}
		/>
	);
}
