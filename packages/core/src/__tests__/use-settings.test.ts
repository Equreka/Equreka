import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SETTINGS_KEY, useSettings } from '../hooks/use-settings';
import { createMemoryStorage } from './memory-storage';

afterEach(cleanup);

describe('useSettings', () => {
	it('defaults to system theme and en locale on empty or corrupt storage', () => {
		const empty = renderHook(() => useSettings(createMemoryStorage()));
		expect(empty.result.current.settings).toEqual({ theme: 'system', locale: 'en' });

		const corrupt = renderHook(() =>
			useSettings(createMemoryStorage({ [SETTINGS_KEY]: '{"theme":"neon","locale":"fr"' })),
		);
		expect(corrupt.result.current.settings).toEqual({ theme: 'system', locale: 'en' });
	});

	it('persists theme and locale independently under the versioned key', () => {
		const storage = createMemoryStorage();
		const { result } = renderHook(() => useSettings(storage));

		act(() => result.current.setTheme('dark'));
		act(() => result.current.setLocale('es'));

		expect(result.current.settings).toEqual({ theme: 'dark', locale: 'es' });
		expect(JSON.parse(storage.get(SETTINGS_KEY) ?? '{}')).toEqual({
			theme: 'dark',
			locale: 'es',
		});
	});

	it('drops unknown values while keeping the valid ones', () => {
		const storage = createMemoryStorage({
			[SETTINGS_KEY]: '{"theme":"dark","locale":"de"}',
		});
		const { result } = renderHook(() => useSettings(storage));
		expect(result.current.settings).toEqual({ theme: 'dark', locale: 'en' });
	});
});
