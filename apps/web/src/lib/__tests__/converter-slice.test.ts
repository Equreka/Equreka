import engineArtifact from '@equreka/content/artifact/engine.json';
import { createUnitRegistry } from '@equreka/engine/units';
import type { EngineSlice } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { buildConverterPayload } from '../../integrations/equreka-assets';
import { converterSliceOf } from '../converter-slice';

const slice = engineArtifact as unknown as EngineSlice;
const full = createUnitRegistry(slice);
const client = createUnitRegistry(converterSliceOf(buildConverterPayload(slice, 'en')));
const slugs = (units: readonly { slug: string }[]): string[] => units.map((u) => u.slug).sort();

describe('converter payload round trip', () => {
	it('keeps the kind scope the full engine slice computes for every magnitude', () => {
		for (const magnitude of Object.keys(slice.magnitudes)) {
			expect(slugs(client.unitsForMagnitude(magnitude)), magnitude).toEqual(
				slugs(full.unitsForMagnitude(magnitude)),
			);
			expect(slugs(client.unitsForMagnitude(magnitude, 'dimension')), magnitude).toEqual(
				slugs(full.unitsForMagnitude(magnitude, 'dimension')),
			);
		}
	});

	it('carries authored kindOf edges to the client', () => {
		const payload = buildConverterPayload(slice, 'en');
		expect(payload.magnitudes.work?.kindOf).toBe('energy');
		expect(payload.magnitudes.energy?.kindOf).toBeUndefined();
		expect(slugs(client.unitsForMagnitude('work'))).toEqual(
			expect.arrayContaining(['erg', 'foot-pound', 'joule', 'kilojoule']),
		);
	});
});
