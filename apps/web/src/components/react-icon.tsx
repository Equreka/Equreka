import type { IconDefinition } from '../lib/icons';

export interface IconProps {
	icon: IconDefinition;
	label?: string | undefined;
	size?: string;
	className?: string;
}

/**
 * React twin of icon.astro for islands, taking the definition itself
 * (`import { searchIcon } from '../lib/icons'`) rather than a name so an
 * island bundles only the glyphs it renders. Same decorative-unless-labelled
 * contract as the Astro component.
 */
export function Icon({ icon, label, size = '1em', className }: IconProps) {
	const classes = className === undefined ? 'eq-icon' : `eq-icon ${className}`;
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={icon.viewBox}
			width={size}
			height={size}
			fill="currentColor"
			focusable="false"
			className={classes}
			role={label === undefined ? undefined : 'img'}
			aria-label={label}
			aria-hidden={label === undefined ? true : undefined}
		>
			{icon.paths.map((path) => (
				<path key={path.d} d={path.d} fillRule={path.fillRule} />
			))}
		</svg>
	);
}
