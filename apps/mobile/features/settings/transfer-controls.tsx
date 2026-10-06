import { exportEnvelope, type ImportResult, importEnvelope } from '@equreka/core';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { useStorage, useT } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { HStack, VStack } from '../../shared/ui/screen';
import { AppText, Muted } from '../../shared/ui/text';

type TransferStatus =
	| { kind: 'idle' }
	| { kind: 'imported'; result: ImportResult }
	| {
			kind: 'error';
			message:
				| 'favorites.importError'
				| 'mobile.transfer.exportFailed'
				| 'mobile.transfer.shareUnavailable';
	  };

const EXPORT_FILE_NAME = 'equreka-favorites.json';

/**
 * The versioned transfer envelope (favorites + path progress) leaves the
 * device through the share sheet — written to the cache directory first,
 * since the sheet needs a file URI — and comes back through the document
 * picker. Both are Expo Go-compatible modules (ADR 0002).
 */
export function TransferControls() {
	const t = useT();
	const storage = useStorage();
	const [status, setStatus] = useState<TransferStatus>({ kind: 'idle' });

	const exportFavorites = async (): Promise<void> => {
		try {
			if (!(await Sharing.isAvailableAsync())) {
				setStatus({ kind: 'error', message: 'mobile.transfer.shareUnavailable' });
				return;
			}
			const file = new File(Paths.cache, EXPORT_FILE_NAME);
			file.write(JSON.stringify(exportEnvelope(storage), null, '\t'));
			await Sharing.shareAsync(file.uri, {
				mimeType: 'application/json',
				UTI: 'public.json',
				dialogTitle: t('favorites.export'),
			});
			setStatus({ kind: 'idle' });
		} catch {
			setStatus({ kind: 'error', message: 'mobile.transfer.exportFailed' });
		}
	};

	const importFavorites = async (): Promise<void> => {
		try {
			const picked = await DocumentPicker.getDocumentAsync({
				type: ['application/json', 'text/plain', '*/*'],
				copyToCacheDirectory: true,
				multiple: false,
			});
			if (picked.canceled) return;
			const asset = picked.assets[0];
			if (asset === undefined) return;
			const text = await new File(asset.uri).text();
			const result = importEnvelope(storage, JSON.parse(text));
			setStatus(
				result === null
					? { kind: 'error', message: 'favorites.importError' }
					: { kind: 'imported', result },
			);
		} catch {
			setStatus({ kind: 'error', message: 'favorites.importError' });
		}
	};

	return (
		<VStack>
			<HStack>
				<Button label={t('favorites.export')} onPress={() => void exportFavorites()} />
				<Button label={t('favorites.import')} onPress={() => void importFavorites()} />
			</HStack>
			<Muted>{t('favorites.transferNote')}</Muted>
			{status.kind === 'imported' ? (
				<AppText size="sm" tone="muted" accessibilityLiveRegion="polite">
					{t('favorites.imported', { count: status.result.favorites })}
					{status.result.steps > 0
						? ` ${t('favorites.importedProgress', { count: status.result.steps })}`
						: ''}
				</AppText>
			) : null}
			{status.kind === 'error' ? (
				<AppText size="sm" tone="danger" accessibilityLiveRegion="assertive">
					{t(status.message)}
				</AppText>
			) : null}
		</VStack>
	);
}
