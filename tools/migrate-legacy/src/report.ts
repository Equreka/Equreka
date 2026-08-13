/**
 * Raised for corpus conditions the codemod refuses to guess about; the
 * orchestrator surfaces the message and exits non-zero.
 */
export class MigrationError extends Error {}

/**
 * Accumulates everything the run must surface on stdout: per-collection
 * counts, the dropped-field inventory, manual-review findings, derivation
 * notes, and the temperature affine coefficients.
 */
export class MigrationReport {
	private readonly counts = new Map<string, number>();
	private readonly dropped = new Map<string, string[]>();
	private readonly reviews: string[] = [];
	private readonly notes: string[] = [];
	private readonly temperatures: string[] = [];
	private fixtureCount = 0;
	private snapCount = 0;

	setCount(collection: string, count: number): void {
		this.counts.set(collection, count);
	}

	drop(collection: string, field: string, slug: string): void {
		const key = `${collection}.${field}`;
		const slugs = this.dropped.get(key) ?? [];
		slugs.push(slug);
		this.dropped.set(key, slugs);
	}

	review(message: string): void {
		this.reviews.push(message);
	}

	note(message: string): void {
		this.notes.push(message);
	}

	temperature(message: string): void {
		this.temperatures.push(message);
	}

	setFixtureCount(count: number): void {
		this.fixtureCount = count;
	}

	addSnap(): void {
		this.snapCount += 1;
	}

	print(): void {
		const lines: string[] = ['', '=== migration report ===', '', 'counts:'];
		for (const [collection, count] of this.counts) {
			lines.push(`  ${collection}: ${count}`);
		}
		lines.push(`  fixtures: ${this.fixtureCount}`);
		lines.push(`  snap-to-rational applications: ${this.snapCount}`);
		lines.push('', 'dropped fields:');
		for (const [key, slugs] of [...this.dropped.entries()].sort((a, b) =>
			a[0].localeCompare(b[0]),
		)) {
			const preview = slugs.length > 8 ? `${slugs.slice(0, 8).join(', ')}, …` : slugs.join(', ');
			lines.push(`  ${key} (${slugs.length}): ${preview}`);
		}
		lines.push('', `manual review (${this.reviews.length}):`);
		for (const item of this.reviews) lines.push(`  - ${item}`);
		lines.push('', 'notes:');
		for (const item of this.notes) lines.push(`  - ${item}`);
		lines.push('', 'temperature toBase coefficients (base = kelvin):');
		for (const item of this.temperatures) lines.push(`  ${item}`);
		lines.push('');
		console.log(lines.join('\n'));
	}
}
