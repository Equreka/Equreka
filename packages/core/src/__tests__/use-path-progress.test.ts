import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
	mergePathProgress,
	PATH_PROGRESS_KEY,
	parsePathProgress,
	usePathProgress,
} from '../hooks/use-path-progress';
import { createMemoryStorage } from './memory-storage';

afterEach(cleanup);

const STEPS = ['intro', 'metre', 'kilogram', 'check-1'];

describe('usePathProgress', () => {
	it('starts empty at 0 % and toggles steps on and off', () => {
		const storage = createMemoryStorage();
		const { result } = renderHook(() => usePathProgress(storage, 'si', STEPS));
		expect(result.current.done.size).toBe(0);
		expect(result.current.percent).toBe(0);

		act(() => result.current.toggleStep('metre'));
		expect(result.current.isDone('metre')).toBe(true);
		expect(result.current.percent).toBe(25);

		act(() => result.current.toggleStep('kilogram'));
		expect(result.current.percent).toBe(50);

		act(() => result.current.toggleStep('metre'));
		expect(result.current.isDone('metre')).toBe(false);
		expect([...result.current.done]).toEqual(['kilogram']);
		expect(JSON.parse(storage.get(PATH_PROGRESS_KEY) ?? '{}')).toEqual({ si: ['kilogram'] });
	});

	it('rounds percent and reaches 100 when every step is done', () => {
		const storage = createMemoryStorage();
		const { result } = renderHook(() => usePathProgress(storage, 'si', ['a', 'b', 'c']));
		act(() => result.current.toggleStep('a'));
		expect(result.current.percent).toBe(33);
		act(() => {
			result.current.toggleStep('b');
			result.current.toggleStep('c');
		});
		expect(result.current.percent).toBe(100);
	});

	it('ignores stored ids that are no longer steps of the path', () => {
		const storage = createMemoryStorage({
			[PATH_PROGRESS_KEY]: JSON.stringify({ si: ['metre', 'retired-step'] }),
		});
		const { result } = renderHook(() => usePathProgress(storage, 'si', STEPS));
		expect([...result.current.done]).toEqual(['metre']);
		expect(result.current.percent).toBe(25);
	});

	it('keeps paths independent and reset clears only its own path', () => {
		const storage = createMemoryStorage();
		const si = renderHook(() => usePathProgress(storage, 'si', STEPS));
		const temp = renderHook(() => usePathProgress(storage, 'temp', ['kelvin', 'celsius']));

		act(() => si.result.current.toggleStep('metre'));
		act(() => temp.result.current.toggleStep('kelvin'));
		expect(si.result.current.percent).toBe(25);
		expect(temp.result.current.percent).toBe(50);

		act(() => si.result.current.reset());
		expect(si.result.current.done.size).toBe(0);
		expect(temp.result.current.isDone('kelvin')).toBe(true);
		expect(JSON.parse(storage.get(PATH_PROGRESS_KEY) ?? '{}')).toEqual({ temp: ['kelvin'] });
	});

	it('keeps two hook instances over one storage in sync', () => {
		const storage = createMemoryStorage();
		const first = renderHook(() => usePathProgress(storage, 'si', STEPS));
		const second = renderHook(() => usePathProgress(storage, 'si', STEPS));
		act(() => first.result.current.toggleStep('check-1'));
		expect(second.result.current.isDone('check-1')).toBe(true);
	});

	it('survives corrupt storage', () => {
		const storage = createMemoryStorage({ [PATH_PROGRESS_KEY]: '{"si":' });
		const { result } = renderHook(() => usePathProgress(storage, 'si', STEPS));
		expect(result.current.done.size).toBe(0);
		act(() => result.current.toggleStep('intro'));
		expect(result.current.percent).toBe(25);
	});
});

describe('parsePathProgress / mergePathProgress', () => {
	it('drops non-array values, non-string ids, and duplicates', () => {
		expect(parsePathProgress(JSON.stringify({ a: ['x', 'x', 3], b: 'nope', c: [] }))).toEqual({
			a: ['x'],
		});
		expect(parsePathProgress('[]')).toEqual({});
		expect(parsePathProgress(null)).toEqual({});
	});

	it('unions per path and counts only new ids', () => {
		const { merged, added } = mergePathProgress(
			{ si: ['metre'], temp: ['kelvin'] },
			{ si: ['metre', 'kilogram'], geo: ['pi'] },
		);
		expect(merged).toEqual({ si: ['metre', 'kilogram'], temp: ['kelvin'], geo: ['pi'] });
		expect(added).toBe(2);
	});
});
