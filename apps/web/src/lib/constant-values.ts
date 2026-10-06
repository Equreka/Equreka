import type { Constant } from '@equreka/schema';

/**
 * `truncated` is true when the card's values cut off a longer true value
 * and print with an ellipsis: the precision card of a truncated constant.
 * Approximations are roundings a reader quotes, so they never carry it.
 */
export interface ConstantValueCard {
	kind: 'approximate' | 'precision';
	values: readonly string[];
	truncated: boolean;
}

/**
 * The legacy value cards of a constant page, left to right. The approximate
 * card lists the authored approximations and is omitted when there are
 * none, which leaves the precision card alone in its row at full width, as
 * the original did.
 */
export function constantValueCards(
	constant: Pick<Constant, 'value' | 'approximations' | 'truncated'>,
): ConstantValueCard[] {
	const precision: ConstantValueCard = {
		kind: 'precision',
		values: [constant.value],
		truncated: constant.truncated,
	};
	return constant.approximations === undefined
		? [precision]
		: [{ kind: 'approximate', values: constant.approximations, truncated: false }, precision];
}
