import type { KVStorage } from '@equreka/core';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { EqurekaProvider } from '../../shared/providers/equreka-provider';
import { createMemoryStorage } from './memory-storage';

type RenderResult = Awaited<ReturnType<typeof render>>;

/**
 * Mounts a screen over the real provider with an in-memory storage, so the
 * screen sees exactly the contract it gets on device minus sqlite.
 */
export function renderWithProvider(
	ui: ReactElement,
	storage: KVStorage = createMemoryStorage(),
): Promise<RenderResult> {
	return render(<EqurekaProvider storage={storage}>{ui}</EqurekaProvider>);
}
