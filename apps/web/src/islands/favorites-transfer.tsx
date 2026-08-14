import type { UseFavorites } from '@equreka/core';
import { type Locale, t } from '@equreka/core/i18n';
import { useRef, useState } from 'react';

export interface FavoritesTransferProps {
	favorites: UseFavorites;
	locale: Locale;
}

type TransferStatus = { kind: 'idle' } | { kind: 'imported'; count: number } | { kind: 'error' };

/**
 * Export/import controls shared by the favorites page and the settings
 * page: export downloads the versioned envelope as JSON, import merges an
 * uploaded envelope into the stored favorites.
 */
export default function FavoritesTransfer({ favorites, locale }: FavoritesTransferProps) {
	const [status, setStatus] = useState<TransferStatus>({ kind: 'idle' });
	const fileRef = useRef<HTMLInputElement>(null);

	const exportFavorites = (): void => {
		const blob = new Blob([JSON.stringify(favorites.exportEnvelope(), null, '\t')], {
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
			const added = favorites.importEnvelope(JSON.parse(await file.text()));
			setStatus(added === null ? { kind: 'error' } : { kind: 'imported', count: added });
		} catch {
			setStatus({ kind: 'error' });
		}
	};

	const buttonClass =
		'rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg';

	return (
		<div>
			<div className="flex flex-wrap gap-3">
				<button type="button" className={buttonClass} onClick={exportFavorites}>
					{t(locale, 'favorites.export')}
				</button>
				<button type="button" className={buttonClass} onClick={() => fileRef.current?.click()}>
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
			<p aria-live="polite" className="mt-2 min-h-5 text-sm">
				{status.kind === 'imported' && (
					<span className="text-ink-muted">
						{t(locale, 'favorites.imported', { count: status.count })}
					</span>
				)}
				{status.kind === 'error' && (
					<span role="alert" className="text-danger">
						{t(locale, 'favorites.importError')}
					</span>
				)}
			</p>
		</div>
	);
}
