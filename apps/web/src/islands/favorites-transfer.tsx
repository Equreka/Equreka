import { exportEnvelope, type ImportResult, importEnvelope } from '@equreka/core';
import { type Locale, t } from '@equreka/core/i18n';
import { useId, useRef, useState } from 'react';
import { Icon } from '../components/react-icon';
import { boxArrowInDownIcon, boxArrowUpIcon } from '../lib/icons';
import { kvLocalStorage } from '../lib/kv-local-storage';

export interface FavoritesTransferProps {
	locale: Locale;
}

type TransferStatus =
	| { kind: 'idle' }
	| { kind: 'imported'; result: ImportResult }
	| { kind: 'error' };

/**
 * Settings export/import controls: export downloads the versioned
 * envelope (favorites + learning-path progress) as JSON, import merges an
 * uploaded envelope into storage.
 */
export default function FavoritesTransfer({ locale }: FavoritesTransferProps) {
	const [status, setStatus] = useState<TransferStatus>({ kind: 'idle' });
	const fileRef = useRef<HTMLInputElement>(null);
	const noteId = useId();

	const exportFavorites = (): void => {
		const blob = new Blob([JSON.stringify(exportEnvelope(kvLocalStorage), null, '\t')], {
			type: 'application/json',
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'equreka-favorites.json';
		link.click();
		URL.revokeObjectURL(url);
	};

	const importFavorites = async (file: File): Promise<void> => {
		try {
			const result = importEnvelope(kvLocalStorage, JSON.parse(await file.text()));
			setStatus(result === null ? { kind: 'error' } : { kind: 'imported', result });
		} catch {
			setStatus({ kind: 'error' });
		}
	};

	const buttonClass = 'eq-btn eq-btn-primary eq-transfer-button';

	return (
		<div>
			<div className="eq-transfer-actions">
				<button
					type="button"
					className={buttonClass}
					aria-describedby={noteId}
					onClick={exportFavorites}
				>
					<Icon icon={boxArrowUpIcon} />
					{t(locale, 'favorites.export')}
				</button>
				<button type="button" className={buttonClass} onClick={() => fileRef.current?.click()}>
					<Icon icon={boxArrowInDownIcon} />
					{t(locale, 'favorites.import')}
				</button>
				<input
					ref={fileRef}
					type="file"
					accept="application/json,.json"
					className="hidden"
					aria-label={t(locale, 'favorites.import')}
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file !== undefined) void importFavorites(file);
						event.target.value = '';
					}}
				/>
			</div>
			<p id={noteId} className="sr-only">
				{t(locale, 'favorites.transferNote')}
			</p>
			<p aria-live="polite" className="eq-transfer-status">
				{status.kind === 'imported' && (
					<span>
						{t(locale, 'favorites.imported', { count: status.result.favorites })}
						{status.result.steps > 0 &&
							` ${t(locale, 'favorites.importedProgress', { count: status.result.steps })}`}
					</span>
				)}
				{status.kind === 'error' && (
					<span role="alert" className="eq-transfer-error">
						{t(locale, 'favorites.importError')}
					</span>
				)}
			</p>
		</div>
	);
}
