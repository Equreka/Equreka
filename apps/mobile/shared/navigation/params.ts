/**
 * Expo Router hands every search param as `string | string[]`; screens
 * take the first value and treat a repeated key as its first occurrence.
 */
export function firstParam(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}
