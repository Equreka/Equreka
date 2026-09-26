/**
 * English UI-chrome catalog — the source language and the fallback for
 * every other locale. Keys are flat dot paths; `{param}` tokens are
 * interpolated by `t`. Content prose (names, descriptions) never lives
 * here — it ships localized in the content artifact.
 */
export const en = {
	'nav.aria': 'Main',
	'nav.units': 'Units',
	'nav.magnitudes': 'Magnitudes',
	'nav.constants': 'Constants',
	'nav.prefixes': 'Prefixes',
	'nav.equations': 'Equations',
	'nav.calculator': 'Calculator',
	'nav.converter': 'Converter',
	'nav.search': 'Search',
	'nav.paths': 'Paths',
	'nav.favorites': 'Favorites',
	'nav.settings': 'Settings',
	'layout.themeToggle': 'Toggle color theme',
	'footer.tagline':
		'Equreka — an open-source educational wiki and calculator for units, magnitudes, constants, and equations.',
	'footer.github': 'GitHub',
	'footer.license': 'GPL-3.0 license',

	'collection.categories': 'Categories',
	'collection.magnitudes': 'Magnitudes',
	'collection.units': 'Units',
	'collection.prefixes': 'Prefixes',
	'collection.constants': 'Constants',
	'collection.variables': 'Variables',
	'collection.equations': 'Equations',
	'collection.paths': 'Paths',

	'system.si': 'SI',
	'system.si-derived': 'SI derived',
	'system.imperial': 'Imperial',
	'system.uscs': 'US customary',
	'system.cgs': 'CGS',
	'system.other': 'Other',

	'kind.equation': 'Equation',
	'kind.formula': 'Formula',
	'term.magnitude': 'Magnitude',
	'term.constant': 'Constant',
	'term.variable': 'Variable',
	'term.symbol': 'Symbol',

	'badge.exact': 'exact',
	'badge.measured': 'measured',
	'badge.dimensionless': 'dimensionless',
	'badge.untranslated': 'not yet translated — shown in English',

	'table.symbol': 'Symbol',
	'table.name': 'Name',
	'table.system': 'System',
	'table.dimension': 'Dimension',
	'table.baseUnit': 'Base unit',
	'table.unit': 'Unit',
	'table.factorToBase': 'Factor to base',
	'table.value': 'Value',
	'table.status': 'Status',
	'table.kind': 'Kind',
	'group.other': 'Other',
	'common.sigFigs': '(6 significant figures)',

	'home.title': 'Equreka — units, magnitudes, and conversions',
	'meta.home':
		'Open-source educational wiki and calculator: units, magnitudes, constants, and equations with computed conversions.',
	'home.lead':
		'A reference wiki for units, magnitudes, constants, and equations — every conversion computed from first principles, never hand-copied.',
	'home.categories': 'Categories',
	'home.browse': 'Browse',
	'home.card.units': 'Units of measurement across systems, with computed conversion tables.',
	'home.card.magnitudes':
		'Physical quantities with their dimensions and the units that measure them.',
	'home.card.constants': 'Physical constants at full precision, exact and measured.',
	'home.card.prefixes': 'SI prefixes — every multiple and submultiple of ten.',
	'home.card.equations': 'Equations and formulas with term-by-term breakdowns.',
	'home.card.calculator': 'Solve any calculator-enabled equation for any of its terms.',
	'home.card.converter': 'Convert values between any pair of compatible units.',
	'home.card.search': 'Find any unit, magnitude, or constant by name, symbol, or alias.',
	'home.card.paths':
		'Guided learning paths through units, constants, and equations, with self-checks.',

	'meta.units': 'All units of measurement in the Equreka wiki, grouped by category.',
	'units.lead':
		'{count} units grouped by category. Every unit page includes a conversion table computed by the Equreka engine.',
	'meta.unit': '{name} ({symbol}) — unit reference and conversions.',
	'unit.magnitude': 'Magnitude',
	'unit.magnitudes': 'Magnitudes',
	'unit.convert': 'Convert {name}',
	'conversions.title': 'Conversions',
	'conversions.lead':
		'The value of 1 {symbol} in every compatible unit, computed by the Equreka engine. Approximate values are rounded to 6 significant figures.',
	'conversions.header': '1 {symbol} =',
	'conversions.baseUnit': 'base unit',

	'meta.magnitudes':
		'All physical magnitudes in the Equreka wiki, grouped by category, with dimensions and base units.',
	'magnitudes.lead':
		'{count} magnitudes grouped by category. Every magnitude page lists all of its units with engine-computed factors to the base unit.',
	'meta.magnitude': '{name} ({symbol}) — magnitude reference with all of its units.',
	'magnitude.sign': 'Sign',
	'magnitude.nonNegative': 'Non-negative quantity',
	'magnitude.unitsOf': 'Units of {name}',
	'magnitude.unitsLead':
		'Every unit measuring this magnitude, with its engine-computed factor to the base unit. Approximate values are rounded to 6 significant figures.',

	'meta.constants':
		'Physical constants in the Equreka wiki, with full-precision values, units, and definitions.',
	'constants.lead':
		'{count} physical constants. Values shown here are rounded to 6 significant figures — each constant page carries the full-precision value.',
	'meta.constant': '{name} ({symbol}) — physical constant reference.',
	'constant.value': 'Value',
	'constant.fullPrecision': 'Full precision',
	'constant.source': 'Source:',
	'constant.statusExact': 'Exact — fixed by definition.',
	'constant.statusMeasured': 'Measured — carries uncertainty.',

	'meta.prefixes':
		'SI unit prefixes — multiples and submultiples of ten, with symbols and power-of-ten notation.',
	'prefixes.lead':
		'{count} SI prefixes. A prefix multiplies a unit by a power of ten — kilometre is 10³ metres, nanosecond is 10⁻⁹ seconds.',
	'prefixes.multiples': 'Multiples',
	'prefixes.submultiples': 'Submultiples',

	'meta.equations':
		'Equations and formulas in the Equreka wiki, with term-by-term breakdowns and calculators.',
	'equations.lead':
		'{count} equations and formulas. Hover a term to highlight it everywhere on the page; calculator-enabled entries solve for any term.',
	'equations.openCalculator': 'Open in the calculator →',
	'meta.equation': '{name} — {kind} reference.',
	'equation.hoverHint': 'Hover or tap a term to highlight it everywhere on this page.',
	'equation.solve': 'Solve with the calculator',
	'equation.terms': 'Terms',
	'equation.relatedUnits': 'Related units',

	'meta.category': 'Everything in the {name} category of the Equreka wiki.',

	'meta.calculator': 'Solve any calculator-enabled equation for any term with the Equreka engine.',
	'calculator.title': 'Calculator',
	'calculator.lead':
		'{count} equations can be solved for any of their terms: fill in every value except one, and the engine computes the rest — no unit conversions to get wrong.',
	'calculator.pageTitle': '{name} calculator',
	'meta.calculatorEquation':
		'Solve {name} for any term — leave one field empty and the Equreka engine computes it.',
	'calculator.leadBefore':
		'Values are in the units shown next to each field. Leave exactly one field empty — the engine solves for it as you type. See the',
	'calculator.leadLink': 'equation reference',
	'calculator.leadAfter': 'for the term-by-term breakdown.',
	'calculator.placeholder': 'Leave empty to solve',
	'calculator.reset': 'Reset',
	'calculator.autoFilled': 'Filled in automatically:',
	'calculator.hint':
		'Fill in every value except the one to solve for — it is computed as you type.',
	'calculator.allRoots': 'All roots: {roots} — the admissible root is shown above.',
	'calculator.failed': 'The calculation failed.',

	'engine.inputs/empty': 'Fill in every value except the one to solve for.',
	'engine.inputs/underdetermined': 'Leave exactly one field empty — the one to solve for.',
	'engine.inputs/overdetermined': 'Every field is filled. Clear the one you want to solve for.',
	'engine.inputs/not-a-number': 'Enter numeric values only.',
	'engine.units/unknown': 'This equation references an unknown unit.',
	'engine.units/incompatible-dimensions': 'These units measure different quantities.',
	'engine.solve/no-real-solution': 'No real solution exists for these values.',
	'engine.solve/domain': 'These values are outside the domain of the equation.',
	'engine.internal/unsupported': 'This equation cannot be solved for that term.',

	'meta.converter':
		'Convert values between compatible units of measurement, computed by the Equreka engine.',
	'converter.title': 'Unit converter',
	'converter.lead':
		"Pick a magnitude, choose the units, and enter a value. Conversions run through each unit's exact factor to the SI-coherent base — results are rounded to 6 significant figures for display.",
	'converter.from': 'From',
	'converter.to': 'To',
	'converter.swap': 'Swap units',
	'converter.loading': 'Loading converter…',
	'converter.loadError': 'Could not load conversion data. Reload the page to try again.',
	'converter.enterValue': 'Enter a value to convert.',
	'converter.notANumber': 'Enter a numeric value.',
	'converter.failed': 'Conversion failed.',

	'meta.search': 'Search every unit, magnitude, constant, and equation in the Equreka wiki.',
	'search.title': 'Search',
	'search.lead': 'Search by name, symbol, or alias — with or without accents.',
	'search.placeholder': 'Search units, magnitudes…',
	'search.aria': 'Search the wiki',
	'search.loading': 'Loading search index…',
	'search.unavailable': 'Search is unavailable right now.',
	'search.noResults': 'No results for “{query}”.',

	'meta.offline':
		'You are offline. Browse the precached Equreka library of units and their descriptions.',
	'offline.title': "You're offline",
	'offline.lead':
		"This page isn't cached yet, but the Equreka library is stored on your device — every entry below works without a connection.",
	'offline.loading': 'Loading offline library…',
	'offline.error': 'The offline library is not available. Reconnect and reload once to store it.',
	'offline.notCached': 'This entry is not in the offline library. Pick one below.',
	'offline.browse': 'Browse the offline library',
	'offline.filterAria': 'Filter offline entries',
	'offline.filterPlaceholder': 'Filter by name, symbol, or alias…',
	'offline.noMatch': 'No offline entries match.',

	'meta.paths':
		'Guided learning paths through the Equreka wiki — ordered steps with self-checks; progress stays on this device.',
	'paths.title': 'Learning paths',
	'paths.lead':
		'{count} guided paths. Each one walks through a few entries in order, with transitions and self-check questions. Progress is stored on this device.',
	'meta.path': '{name} — a {level} learning path in {count} steps.',
	'path.level.intro': 'Intro',
	'path.level.intermediate': 'Intermediate',
	'path.level.advanced': 'Advanced',
	'path.steps': '{count} steps',
	'path.minutes': '{count} min',
	'path.prerequisites': 'Before this path',
	'path.progress': '{done} of {total} steps done',
	'path.progressAria': 'Path progress',
	'path.completed': 'Completed',
	'path.markDone': 'Mark step as done',
	'path.markUndone': 'Mark step as not done',
	'path.stepOf': 'Step {n} of {total}',
	'path.prev': 'Previous step',
	'path.next': 'Next step',
	'path.backToPath': 'Back to the path',
	'path.reset': 'Reset progress',
	'path.check': 'Check yourself',
	'path.reveal': 'Show the answer',
	'path.openEntry': 'Open the entry',
	'path.kind.entry': 'Entry',
	'path.kind.prose': 'Reading',
	'path.kind.check': 'Self-check',
	'offline.outline': 'Steps',

	'meta.favorites': 'Your favorite entries, stored on this device — export or import them as JSON.',
	'favorites.title': 'Favorites',
	'favorites.lead': 'Favorites are stored locally in your browser — nothing leaves this device.',
	'favorites.none': "You don't have any favorites yet. Tap the heart on any entry to add it.",
	'favorites.add': 'Add to favorites',
	'favorites.remove': 'Remove from favorites',
	'favorites.removeShort': 'Remove',
	'favorites.export': 'Export favorites',
	'favorites.import': 'Import favorites',
	'favorites.importError': 'That file is not a valid favorites export.',
	'favorites.imported': 'Imported {count} new favorites.',
	'favorites.importedProgress': 'Imported {count} completed path steps.',
	'favorites.transferNote': 'Exports also include your learning-path progress.',

	'meta.settings':
		'Theme, language, and favorites for this device — settings never leave your browser.',
	'settings.title': 'Settings',
	'settings.lead': 'Settings are stored on this device — we hold nothing about you on any server.',
	'settings.theme': 'Theme',
	'settings.theme.system': 'System',
	'settings.theme.light': 'Light',
	'settings.theme.dark': 'Dark',
	'settings.language': 'Language',
	'settings.favorites': 'Favorites',
	'settings.version': 'Version',

	'nav.home': 'Home',
	'mobile.notFound.title': 'Screen not found',
	'mobile.notFound.lead': 'That link points nowhere in this build.',
	'mobile.notFound.home': 'Go to Home',
	'mobile.entry.notFound': 'This entry is not in the bundled library.',
	'mobile.entry.count': '{count} entries',
	'mobile.entry.related': 'Related',
	'mobile.search.start': 'Type to search by name, symbol, or alias.',
	'mobile.search.building': 'Building the search index…',
	'mobile.transfer.exportFailed': 'Could not export favorites.',
	'mobile.transfer.shareUnavailable': 'Sharing is unavailable on this device.',
	'mobile.category.empty': 'Nothing in this category yet.',
	'mobile.picker.filter': 'Filter…',
	'mobile.picker.close': 'Close',
	'mobile.check.hide': 'Hide the answer',
	'mobile.math.unavailable': 'Rendered math is not available in this build.',
} as const;

export type MessageKey = keyof typeof en;
