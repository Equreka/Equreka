import type { Constant } from '@equreka/schema';

export interface ConstantValueCard {
	kind: 'approximate' | 'precision';
	values: readonly string[];
}

/**
 * The legacy value cards of a constant page, left to right. The approximate
 * card lists the authored approximations and is omitted when there are
 * none, which leaves the precision card alone in its row at full width, as
 * the original did.
 */
export function constantValueCards(
	constant: Pick<Constant, 'value' | 'approximations'>,
): ConstantValueCard[] {
	const precision: ConstantValueCard = { kind: 'precision', values: [constant.value] };
	return constant.approximations === undefined
		? [precision]
		: [{ kind: 'approximate', values: constant.approximations }, precision];
}
