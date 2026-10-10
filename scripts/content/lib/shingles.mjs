/**
 * Word-shingle overlap between a description and a source text: the pure
 * core of the originality check (ADR 0011), free of I/O so tests and the
 * content verifier share it. A shingle is a run of `SHINGLE_SIZE`
 * consecutive normalized words.
 */
export const SHINGLE_SIZE = 8;

/**
 * Flag thresholds (ADR 0011). A longest shared run of `MIN_SHARED_RUN`
 * words already means one shared shingle, so the run rule subsumes the
 * overlap rule; the ratio is reported to rank how much of a description
 * is copied, not to widen the net.
 */
export const THRESHOLDS = Object.freeze({ minRun: 8, minOverlap: 0.15 });

const DISPLAY_MATH = /\$\$[\s\S]*?\$\$/g;
const INLINE_MATH = /\$[^$\n]*\$/g;
const COMBINING_MARKS = /\p{M}+/gu;
const NON_WORD = /[^\p{L}\p{N}]+/gu;

/**
 * Text with every `$$...$$` and `$...$` span blanked: authored TeX never
 * matches an article's rendered math, so it only adds noise.
 */
export function stripMath(text) {
	return text.replace(DISPLAY_MATH, ' ').replace(INLINE_MATH, ' ');
}

/**
 * Lowercase words separated by single spaces, with diacritics folded so an
 * accent edit does not hide a copy.
 */
export function normalizeText(text) {
	return stripMath(text)
		.normalize('NFKD')
		.replace(COMBINING_MARKS, '')
		.toLowerCase()
		.replace(NON_WORD, ' ')
		.trim();
}

export function wordsOf(text) {
	const normalized = normalizeText(text);
	return normalized === '' ? [] : normalized.split(' ');
}

export function shinglesOf(words, size = SHINGLE_SIZE) {
	const count = Math.max(0, words.length - size + 1);
	return new Set(
		Array.from({ length: count }, (_, start) => words.slice(start, start + size).join(' ')),
	);
}

/**
 * The longest run present in both word lists, as its length in words and
 * its first index in `left`: the longest common substring over words, by
 * dynamic programming on two rows.
 */
export function longestCommonRun(left, right) {
	let best = { length: 0, start: 0 };
	let previous = new Uint32Array(right.length + 1);
	for (let i = 1; i <= left.length; i += 1) {
		const current = new Uint32Array(right.length + 1);
		for (let j = 1; j <= right.length; j += 1) {
			if (left[i - 1] === right[j - 1]) {
				current[j] = previous[j - 1] + 1;
				if (current[j] > best.length) {
					best = { length: current[j], start: i - current[j] };
				}
			}
		}
		previous = current;
	}
	return best;
}

export function longestSharedRun(left, right) {
	return longestCommonRun(left, right).length;
}

/**
 * Overlap of `candidate` (the description) against `source` (the article):
 * `overlap` is the share of the candidate's shingles found in the source,
 * 0 when the candidate is shorter than one shingle; `run` is the longest
 * shared run in normalized words, so a report can name the copied passage.
 */
export function compareTexts(candidate, source, size = SHINGLE_SIZE) {
	const candidateWords = wordsOf(candidate);
	const sourceWords = wordsOf(source);
	const candidateShingles = shinglesOf(candidateWords, size);
	const sourceShingles = shinglesOf(sourceWords, size);
	const sharedShingles = [...candidateShingles].filter((shingle) =>
		sourceShingles.has(shingle),
	).length;
	const run = longestCommonRun(candidateWords, sourceWords);
	return {
		words: candidateWords.length,
		shingles: candidateShingles.size,
		sharedShingles,
		longestRun: run.length,
		run: candidateWords.slice(run.start, run.start + run.length).join(' '),
		overlap: candidateShingles.size === 0 ? 0 : sharedShingles / candidateShingles.size,
	};
}

export function isFlagged(comparison, thresholds = THRESHOLDS) {
	return comparison.longestRun >= thresholds.minRun || comparison.overlap >= thresholds.minOverlap;
}

/**
 * The bar for an article found by phrase search rather than by the entry's
 * own Wikidata item: both rules must hold, because a single 8-word stock
 * phrase ("the base unit of length in the") occurs in unrelated articles,
 * while a copied passage also carries a large share of the shingles.
 */
export function isStrongMatch(comparison, thresholds = THRESHOLDS) {
	return comparison.longestRun >= thresholds.minRun && comparison.overlap >= thresholds.minOverlap;
}
