import type { MessageKey } from './en';

/**
 * Spanish (es-MX-neutral) UI-chrome catalog. Strings port the legacy
 * languages/es.json where a key survived (grammar fixed: «has» for «haz»,
 * «Idioma» for «Lenguaje»); the rest is written natively, never
 * machine-translated. Partial by type so future keys can land en-first —
 * `t` falls back to English for any gap.
 */
export const es: Partial<Record<MessageKey, string>> = {
	'nav.aria': 'Principal',
	'nav.units': 'Unidades',
	'nav.magnitudes': 'Magnitudes',
	'nav.constants': 'Constantes',
	'nav.prefixes': 'Prefijos',
	'nav.equations': 'Ecuaciones',
	'nav.calculator': 'Calculadora',
	'nav.converter': 'Convertidor',
	'nav.search': 'Buscar',
	'nav.favorites': 'Favoritos',
	'nav.settings': 'Ajustes',
	'layout.themeToggle': 'Cambiar el tema de color',
	'footer.tagline':
		'Equreka — una wiki educativa y calculadora de código abierto para unidades, magnitudes, constantes y ecuaciones.',
	'footer.github': 'GitHub',
	'footer.license': 'Licencia GPL-3.0',

	'collection.categories': 'Categorías',
	'collection.magnitudes': 'Magnitudes',
	'collection.units': 'Unidades',
	'collection.prefixes': 'Prefijos',
	'collection.constants': 'Constantes',
	'collection.variables': 'Variables',
	'collection.equations': 'Ecuaciones',
	'collection.paths': 'Rutas',

	'system.si': 'SI',
	'system.si-derived': 'Derivada del SI',
	'system.imperial': 'Imperial',
	'system.uscs': 'Usual de EE. UU.',
	'system.cgs': 'CGS',
	'system.other': 'Otro',

	'kind.equation': 'Ecuación',
	'kind.formula': 'Fórmula',
	'term.magnitude': 'Magnitud',
	'term.constant': 'Constante',
	'term.variable': 'Variable',

	'badge.exact': 'exacta',
	'badge.measured': 'medida',
	'badge.dimensionless': 'adimensional',
	'badge.untranslated': 'aún sin traducir — se muestra en inglés',

	'table.symbol': 'Símbolo',
	'table.name': 'Nombre',
	'table.system': 'Sistema',
	'table.dimension': 'Dimensión',
	'table.baseUnit': 'Unidad base',
	'table.unit': 'Unidad',
	'table.factorToBase': 'Factor a la base',
	'table.value': 'Valor',
	'table.status': 'Estado',
	'table.kind': 'Tipo',
	'group.other': 'Otros',
	'common.sigFigs': '(6 cifras significativas)',

	'home.title': 'Equreka — unidades, magnitudes y conversiones',
	'meta.home':
		'Wiki educativa y calculadora de código abierto: unidades, magnitudes, constantes y ecuaciones con conversiones calculadas.',
	'home.lead':
		'Una wiki de referencia de unidades, magnitudes, constantes y ecuaciones — cada conversión se calcula desde primeros principios, nunca se copia a mano.',
	'home.categories': 'Categorías',
	'home.browse': 'Explorar',
	'home.card.units':
		'Unidades de medida de todos los sistemas, con tablas de conversión calculadas.',
	'home.card.magnitudes': 'Magnitudes físicas con sus dimensiones y las unidades que las miden.',
	'home.card.constants': 'Constantes físicas a precisión completa, exactas y medidas.',
	'home.card.prefixes': 'Prefijos del SI — cada múltiplo y submúltiplo de diez.',
	'home.card.equations': 'Ecuaciones y fórmulas con desglose término a término.',
	'home.card.calculator': 'Resuelve cualquier ecuación habilitada para cualquiera de sus términos.',
	'home.card.converter': 'Convierte valores entre cualquier par de unidades compatibles.',
	'home.card.search':
		'Encuentra cualquier unidad, magnitud o constante por nombre, símbolo o alias.',

	'meta.units': 'Todas las unidades de medida de la wiki de Equreka, agrupadas por categoría.',
	'units.lead':
		'{count} unidades agrupadas por categoría. Cada página de unidad incluye una tabla de conversión calculada por el motor de Equreka.',
	'meta.unit': '{name} ({symbol}) — referencia de la unidad y conversiones.',
	'unit.magnitude': 'Magnitud',
	'unit.magnitudes': 'Magnitudes',
	'unit.convert': 'Convertir {name}',
	'conversions.title': 'Conversiones',
	'conversions.lead':
		'El valor de 1 {symbol} en cada unidad compatible, calculado por el motor de Equreka. Los valores aproximados se redondean a 6 cifras significativas.',
	'conversions.header': '1 {symbol} =',
	'conversions.baseUnit': 'unidad base',

	'meta.magnitudes':
		'Todas las magnitudes físicas de la wiki de Equreka, agrupadas por categoría, con dimensiones y unidades base.',
	'magnitudes.lead':
		'{count} magnitudes agrupadas por categoría. Cada página de magnitud lista todas sus unidades con factores a la unidad base calculados por el motor.',
	'meta.magnitude': '{name} ({symbol}) — referencia de la magnitud con todas sus unidades.',
	'magnitude.sign': 'Signo',
	'magnitude.nonNegative': 'Cantidad no negativa',
	'magnitude.unitsOf': 'Unidades de {name}',
	'magnitude.unitsLead':
		'Cada unidad que mide esta magnitud, con su factor a la unidad base calculado por el motor. Los valores aproximados se redondean a 6 cifras significativas.',

	'meta.constants':
		'Constantes físicas de la wiki de Equreka, con valores a precisión completa, unidades y definiciones.',
	'constants.lead':
		'{count} constantes físicas. Los valores aquí se redondean a 6 cifras significativas — cada página de constante lleva el valor a precisión completa.',
	'meta.constant': '{name} ({symbol}) — referencia de constante física.',
	'constant.value': 'Valor',
	'constant.fullPrecision': 'Precisión completa',
	'constant.source': 'Fuente:',
	'constant.statusExact': 'Exacta — fijada por definición.',
	'constant.statusMeasured': 'Medida — conlleva incertidumbre.',

	'meta.prefixes':
		'Prefijos de unidades del SI — múltiplos y submúltiplos de diez, con símbolos y notación de potencias de diez.',
	'prefixes.lead':
		'{count} prefijos del SI. Un prefijo multiplica una unidad por una potencia de diez — un kilómetro son 10³ metros, un nanosegundo son 10⁻⁹ segundos.',
	'prefixes.multiples': 'Múltiplos',
	'prefixes.submultiples': 'Submúltiplos',

	'meta.equations':
		'Ecuaciones y fórmulas de la wiki de Equreka, con desglose término a término y calculadoras.',
	'equations.lead':
		'{count} ecuaciones y fórmulas. Pasa el cursor sobre un término para resaltarlo en toda la página; las entradas habilitadas se resuelven para cualquier término.',
	'equations.openCalculator': 'Abrir en la calculadora →',
	'meta.equation': '{name} — referencia de {kind}.',
	'equation.hoverHint': 'Pasa el cursor o toca un término para resaltarlo en toda esta página.',
	'equation.solve': 'Resolver con la calculadora',
	'equation.terms': 'Términos',
	'equation.relatedUnits': 'Unidades relacionadas',

	'meta.category': 'Todo en la categoría {name} de la wiki de Equreka.',

	'meta.calculator':
		'Resuelve cualquier ecuación habilitada para cualquier término con el motor de Equreka.',
	'calculator.title': 'Calculadora',
	'calculator.lead':
		'{count} ecuaciones pueden resolverse para cualquiera de sus términos: llena todos los valores excepto uno y el motor calcula el resto — sin conversiones de unidades que fallen.',
	'calculator.pageTitle': 'Calculadora de {name}',
	'meta.calculatorEquation':
		'Resuelve {name} para cualquier término — deja un campo vacío y el motor de Equreka lo calcula.',
	'calculator.leadBefore':
		'Los valores usan las unidades mostradas junto a cada campo. Deja exactamente un campo vacío — el motor lo despeja mientras escribes. Consulta la',
	'calculator.leadLink': 'referencia de la ecuación',
	'calculator.leadAfter': 'para el desglose término a término.',
	'calculator.placeholder': 'Déjalo vacío para despejar',
	'calculator.reset': 'Restablecer',
	'calculator.autoFilled': 'Completado automáticamente:',
	'calculator.hint':
		'Llena todos los valores excepto el que quieres despejar — se calcula mientras escribes.',
	'calculator.allRoots': 'Todas las raíces: {roots} — arriba se muestra la raíz admisible.',
	'calculator.failed': 'El cálculo falló.',

	'engine.inputs/empty': 'Llena todos los valores excepto el que quieres despejar.',
	'engine.inputs/underdetermined': 'Deja exactamente un campo vacío — el que quieres despejar.',
	'engine.inputs/overdetermined': 'Todos los campos están llenos. Borra el que quieres despejar.',
	'engine.inputs/not-a-number': 'Introduce solo valores numéricos.',
	'engine.units/unknown': 'Esta ecuación hace referencia a una unidad desconocida.',
	'engine.units/incompatible-dimensions': 'Estas unidades miden cantidades diferentes.',
	'engine.solve/no-real-solution': 'No existe una solución real para estos valores.',
	'engine.solve/domain': 'Estos valores están fuera del dominio de la ecuación.',
	'engine.internal/unsupported': 'Esta ecuación no puede resolverse para ese término.',

	'meta.converter':
		'Convierte valores entre unidades de medida compatibles, calculados por el motor de Equreka.',
	'converter.title': 'Convertidor de unidades',
	'converter.lead':
		'Elige una magnitud, selecciona las unidades e introduce un valor. Las conversiones pasan por el factor exacto de cada unidad a la base coherente con el SI — los resultados se redondean a 6 cifras significativas.',
	'converter.from': 'De',
	'converter.to': 'A',
	'converter.swap': 'Intercambiar unidades',
	'converter.loading': 'Cargando el convertidor…',
	'converter.loadError':
		'No se pudieron cargar los datos de conversión. Recarga la página para reintentar.',
	'converter.enterValue': 'Introduce un valor para convertir.',
	'converter.notANumber': 'Introduce un valor numérico.',
	'converter.failed': 'La conversión falló.',

	'meta.search': 'Busca cualquier unidad, magnitud, constante o ecuación de la wiki de Equreka.',
	'search.title': 'Buscar',
	'search.lead': 'Busca por nombre, símbolo o alias — con o sin acentos.',
	'search.placeholder': 'Busca unidades, magnitudes…',
	'search.aria': 'Buscar en la wiki',
	'search.loading': 'Cargando el índice de búsqueda…',
	'search.unavailable': 'La búsqueda no está disponible en este momento.',
	'search.noResults': 'Sin resultados para «{query}».',

	'meta.offline':
		'Sin conexión. Explora la biblioteca de Equreka almacenada en tu dispositivo con unidades y sus descripciones.',
	'offline.title': 'Sin conexión',
	'offline.lead':
		'Esta página aún no está en caché, pero la biblioteca de Equreka está guardada en tu dispositivo — todas las entradas de abajo funcionan sin conexión.',
	'offline.loading': 'Cargando la biblioteca sin conexión…',
	'offline.error':
		'La biblioteca sin conexión no está disponible. Conéctate y recarga una vez para guardarla.',
	'offline.notCached': 'Esta entrada no está en la biblioteca sin conexión. Elige una abajo.',
	'offline.browse': 'Explora la biblioteca sin conexión',
	'offline.filterAria': 'Filtrar entradas sin conexión',
	'offline.filterPlaceholder': 'Filtra por nombre, símbolo o alias…',
	'offline.noMatch': 'Ninguna entrada sin conexión coincide.',

	'meta.favorites':
		'Tus entradas favoritas, guardadas en este dispositivo — expórtalas o impórtalas como JSON.',
	'favorites.title': 'Favoritos',
	'favorites.lead':
		'Tus favoritos se guardan localmente en el navegador — nada sale de este dispositivo.',
	'favorites.none': 'Aún no tienes favoritos. Toca el corazón en cualquier entrada para agregarla.',
	'favorites.add': 'Agregar a favoritos',
	'favorites.remove': 'Eliminar de favoritos',
	'favorites.removeShort': 'Quitar',
	'favorites.export': 'Exportar favoritos',
	'favorites.import': 'Importar favoritos',
	'favorites.importError': 'Ese archivo no es una exportación válida de favoritos.',
	'favorites.imported': 'Se importaron {count} favoritos nuevos.',

	'meta.settings':
		'Tema, idioma y favoritos de este dispositivo — los ajustes nunca salen de tu navegador.',
	'settings.title': 'Ajustes',
	'settings.lead':
		'Los ajustes se guardan en este dispositivo — no tenemos ninguna información tuya en ningún servidor.',
	'settings.theme': 'Tema',
	'settings.theme.system': 'Del sistema',
	'settings.theme.light': 'Claro',
	'settings.theme.dark': 'Oscuro',
	'settings.language': 'Idioma',
	'settings.favorites': 'Favoritos',
	'settings.version': 'Versión',
};
