import { collectionSchemas } from '@equreka/schema';
import { type Corpus, emptyCorpus } from '../validate.js';

/**
 * A corpus holding only the given raw entities, each parsed through its
 * authored schema so defaults and coercions apply as they do for YAML.
 */
export function corpusWith(
	entities: Partial<Record<keyof Corpus, Record<string, unknown>>>,
): Corpus {
	const corpus = emptyCorpus();
	for (const [collection, bySlug] of Object.entries(entities) as [
		keyof Corpus,
		Record<string, unknown> | undefined,
	][]) {
		for (const [slug, data] of Object.entries(bySlug ?? {})) {
			(corpus[collection] as Map<string, unknown>).set(
				slug,
				collectionSchemas[collection].parse(data),
			);
		}
	}
	return corpus;
}
