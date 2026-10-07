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
	'nav.paths': 'Rutas',
	'nav.favorites': 'Favoritos',
	'nav.settings': 'Ajustes',
	'footer.brand': 'Equreka',
	'footer.github': 'GitHub',
	'footer.facebook': 'Facebook',
	'footer.twitter': 'Twitter',
	'footer.discord': 'Discord',
	'design.shell.skipToContent': 'Saltar al contenido',
	'design.shell.homeLink': 'Inicio de Equreka',
	'design.shell.sectionsNav': 'Secciones',
	'design.interactive.editFavorites': 'Editar favoritos',
	'design.interactive.openEquation': 'Abrir la referencia de la ecuación',
	'design.legacy.calculator.calculate': 'Calcular',
	'design.legacy.calculator.needed': 'Ingresa datos para resolver',
	'design.legacy.calculator.copy': 'Copiar al portapapeles',
	'design.legacy.calculator.copied': 'Se copió al portapapeles',
	'design.legacy.calculator.copyFailed': 'No se pudo copiar al portapapeles',
	'design.legacy.favorites.actions': 'Acciones',
	'design.legacy.favorites.openCalculator': 'Resolver en la calculadora',
	'design.legacy.favorites.openConverter': 'Abrir el convertidor de unidades',
	'design.legacy.favorites.lead':
		'Sus favoritos se almacenan localmente en el navegador, por lo que no se guardan datos.',
	'design.legacy.favorites.none': '¡No tienes ningún favorito! 💔',
	'design.legacy.calculator.indexLead': 'Todas las ecuaciones y fórmulas disponibles.',
	'design.legacy.calculator.formulas': 'Fórmulas',
	'design.legacy.settings.languageChange': 'Cambia el lenguaje',
	'design.legacy.settings.languageChoose': 'Elige un lenguaje',
	'design.legacy.settings.themeChange': 'Cambia el tema',
	'design.legacy.settings.themeChoose': 'Selecciona un tema',
	'design.legacy.settings.themeSystem': 'Tema del sistema',
	'design.legacy.abbr.universal': 'Uni',
	'design.legacy.abbr.mathematics': 'Mat',
	'design.legacy.abbr.physics': 'Fís',
	'design.legacy.abbr.chemistry': 'Quím',
	'design.legacy.abbr.symbol': 'Símb',
	'design.content.home.types': 'Tipos',
	'design.content.header.type': 'Tipo',
	'design.content.header.category': 'Categoría',
	'design.content.viewAll': 'Ver todo',
	'design.content.entry.information': 'Información',
	'design.content.entry.unitOf': 'Unidad de',
	'design.content.entry.approximateValues': 'Valores aproximados',
	'design.content.entry.exactValues': 'Valores exactos',
	'design.content.prefixes.exponent': 'Exponente',
	'design.content.prefixes.number': 'Número',
	'design.content.code.title': 'Código',
	'design.content.code.copy': 'Copiar al portapapeles',
	'design.content.code.copied': 'Copiado al portapapeles',
	'design.content.code.copyFailed': 'No se pudo copiar al portapapeles',
	'design.content.abbr.value': 'Val',
	'design.content.abbr.unit': 'Unid',
	'design.content.abbr.conversion': 'Conv',
	'design.content.table.conversion': 'Conversión',
	'design.content.table.formula': 'Fórmula',
	'design.content.home.formulas': 'Fórmulas',
	'design.content.home.type.equations':
		'En matemáticas, una ecuación es una declaración que afirma la igualdad de dos expresiones, que están conectadas por el signo de igualdad.',
	'design.content.home.type.formulas':
		'En ciencia, una fórmula es una forma concisa de expresar información simbólicamente, como en una fórmula matemática o una fórmula química. El uso informal del término fórmula en ciencia se refiere al constructo general de una relación entre cantidades dadas.',
	'design.content.home.type.constants':
		'Un número fijo y bien definido u otro objeto matemático que no varíe. Los términos constante matemática o constante física se utilizan a veces para distinguir este significado.',
	'design.content.home.type.magnitudes':
		'Una magnitud física es una cantidad medible de un sistema físico a la que se le pueden asignar distintos valores como resultado de una medición o una relación de medidas. Las magnitudes físicas se miden usando un patrón que tenga bien definida esa magnitud, y tomando como unidad la cantidad de esa propiedad que posea el objeto patrón.',
	'design.content.home.type.variables':
		'Una variable es un símbolo que funciona como marcador de posición para expresiones o cantidades que pueden variar o cambiar; se utiliza a menudo para representar el argumento de una función o un elemento arbitrario de un conjunto. Además de los números, las variables se utilizan comúnmente para representar vectores, matrices y funciones.',
	'design.content.home.type.units':
		'Una unidad de medida es una cantidad estandarizada de una determinada magnitud física, definida y adoptada por convención o por ley. Cualquier valor de una cantidad física puede expresarse como un múltiplo de la unidad de medida.',
	'design.content.home.type.prefixes':
		'Un prefijo de unidad es un especificador o nemotécnico que se antepone a las unidades de medida para indicar múltiplos o fracciones de las unidades. Las unidades de varios tamaños se forman comúnmente mediante el uso de tales prefijos.',
	'design.content.home.category.universal':
		'Dentro de la ciencia existen propiedades que se pueden aplicar a diferentes ramas, a esto se le conoce como propiedad universal, por ejemplo las constantes y unidades. En esta categoria puedes encontrarlas todas.',
	'design.content.home.category.mathematics':
		"Las matemáticas (del griego: μάθημα, máthēma, 'conocimiento, estudio, aprendizaje') incluyen el estudio de temas como cantidad (teoría de números), estructura (álgebra), espacio (geometría) y cambio (análisis). No tiene una definición generalmente aceptada.",
	'design.content.home.category.physics':
		"La física (del griego antiguo: φυσική (ἐπιστήμη), romanizado: physikḗ (epistḗmē), literalmente 'conocimiento de la naturaleza', de φύσις phýsis 'naturaleza') es la ciencia natural que estudia la materia, su movimiento y comportamiento a través del espacio y el tiempo, y las entidades relacionadas de energía y fuerza. La física es una de las disciplinas científicas más fundamentales y su principal objetivo es comprender cómo se comporta el universo.",
	'design.content.home.category.chemistry':
		'La química es la disciplina científica involucrada con elementos y compuestos compuestos por átomos, moléculas e iones: su composición, estructura, propiedades, comportamiento y los cambios que experimentan durante una reacción con otras sustancias.',
	'design.content.entry.relations': 'Relaciones',
	'design.content.actions.download': 'Descargar archivo json',
	'design.content.actions.report': 'Reportar un error',

	'collection.categories': 'Categorías',
	'collection.magnitudes': 'Magnitudes',
	'collection.units': 'Unidades',
	'collection.prefixes': 'Prefijos',
	'collection.constants': 'Constantes',
	'collection.variables': 'Variables',
	'collection.equations': 'Ecuaciones',
	'collection.paths': 'Rutas',
	'collection.branches': 'Ramas',

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
	'term.symbol': 'Símbolo',

	'badge.exact': 'exacta',
	'badge.measured': 'medida',
	'badge.dimensionless': 'adimensional',
	'badge.untranslated': 'aún sin traducir — se muestra en inglés',
	'badge.draft': 'borrador',
	'badge.draftHint': 'Aún sin revisión editorial frente a sus fuentes.',
	'badge.compound': 'compuesta',

	'table.symbol': 'Símbolo',
	'table.name': 'Nombre',
	'table.dimension': 'Dimensión',
	'table.baseUnit': 'Unidad base',
	'table.unit': 'Unidad',
	'table.factorToBase': 'Factor a la base',
	'table.value': 'Valor',
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
	'home.card.paths':
		'Rutas de aprendizaje guiadas por unidades, constantes y ecuaciones, con autoevaluaciones.',

	'meta.units':
		'Todas las unidades de medida de la wiki de Equreka, agrupadas por categoría y rama.',
	'units.lead':
		'{count} unidades agrupadas por categoría y rama. Cada página de unidad incluye una tabla de conversión calculada por el motor de Equreka.',
	'meta.unit': '{name} ({symbol}) — referencia de la unidad y conversiones.',
	'unit.magnitude': 'Magnitud',
	'unit.magnitudes': 'Magnitudes',
	'unit.compoundHint':
		'Unidad compuesta: su dimensión proviene de su composición, no de una magnitud con nombre.',
	'unit.convert': 'Convertir {name}',
	'unit.derivedFrom': 'Derivada de {base} con el prefijo SI {prefix}.',
	'conversions.title': 'Conversiones',
	'conversions.lead':
		'El valor de 1 {symbol} en cada unidad compatible, calculado por el motor de Equreka. Los valores aproximados se redondean a 6 cifras significativas.',
	'conversions.baseUnit': 'unidad base',
	'entry.identifiers': 'Identificadores',

	'meta.magnitudes':
		'Todas las magnitudes físicas de la wiki de Equreka, agrupadas por categoría y rama, con dimensiones y unidades base.',
	'meta.magnitude': '{name} ({symbol}) — referencia de la magnitud con todas sus unidades.',
	'magnitude.sign': 'Signo',
	'magnitude.nonNegative': 'Cantidad no negativa',
	'magnitude.unitsOf': 'Unidades de {name}',
	'magnitude.unitsLead':
		'Cada unidad que mide esta magnitud o sus magnitudes más generales y más específicas, con su factor a la unidad base calculado por el motor. Los valores aproximados se redondean a 6 cifras significativas.',
	'magnitude.broaderKind': 'Magnitud más general',
	'magnitude.narrowerKinds': 'Magnitudes más específicas',
	'magnitude.sameDimension': 'Misma dimensión',
	'magnitude.sameDimensionHint':
		'Magnitudes distintas que comparten esta dimensión. Sus unidades se convierten numéricamente, pero el resultado es otra magnitud física.',

	'meta.constants':
		'Constantes físicas de la wiki de Equreka, con valores a precisión completa, unidades y definiciones.',
	'meta.constant': '{name} ({symbol}) — referencia de constante física.',
	'constant.value': 'Valor',
	'constant.fullPrecision': 'Precisión completa',
	'constant.source': 'Fuente:',
	'constant.statusExact': 'Exacta — fijada por definición.',
	'constant.statusMeasured': 'Medida — conlleva incertidumbre.',

	'meta.prefixes':
		'Prefijos de unidades del SI — múltiplos y submúltiplos de diez, con símbolos y notación de potencias de diez.',
	'prefixes.multiples': 'Múltiplos',
	'prefixes.submultiples': 'Submúltiplos',

	'meta.equations':
		'Ecuaciones y fórmulas de la wiki de Equreka, con desglose término a término y calculadoras.',
	'meta.equation': '{name} — referencia de {kind}.',
	'equation.hoverHint': 'Pasa el cursor o toca un término para resaltarlo en toda esta página.',
	'equation.solve': 'Resolver con la calculadora',
	'equation.terms': 'Términos',
	'equation.relatedUnits': 'Unidades relacionadas',

	'meta.category': 'Todo en la categoría {name} de la wiki de Equreka.',
	'category.branches': 'Ramas',
	'branch.general': 'General',
	'branch.of': 'Rama de {category}',
	'meta.branch': 'Todo en {name}, una rama de {category}, en la wiki de Equreka.',
	'mobile.branch.empty': 'Todavía no hay nada en esta rama.',

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
	'calculator.required': 'Obligatorio',
	'calculator.solvableOnly': 'Esta calculadora solo despeja {terms}: llena todos los demás campos.',
	'calculator.reset': 'Restablecer',
	'calculator.autoFilled': 'Completado automáticamente:',
	'calculator.hint':
		'Llena todos los valores excepto el que quieres despejar — se calcula mientras escribes.',
	'calculator.allRoots': 'Todas las raíces: {roots} — arriba se muestra la raíz admisible.',
	'calculator.precision.readable': '(hasta {count} cifras significativas)',
	'calculator.precision.scientific': '(precisión completa)',
	'calculator.failed': 'El cálculo falló.',
	'calculator.unitFor': 'Unidad de {name}',
	'calculator.resultUnit': 'Unidad del resultado',
	'calculator.solvedFormBaseUnits':
		'La forma sustituida muestra cada valor en la unidad base de su término, las unidades en que está escrita la fórmula.',
	'calculator.unitsUnavailable':
		'No se pudieron cargar las unidades. Introduce los valores en las unidades mostradas.',
	'calculator.solverUnavailable':
		'No se pudo cargar la calculadora. Recarga la página para intentarlo de nuevo.',

	'engine.inputs/empty': 'Llena todos los valores excepto el que quieres despejar.',
	'engine.inputs/underdetermined': 'Deja exactamente un campo vacío — el que quieres despejar.',
	'engine.inputs/overdetermined': 'Todos los campos están llenos. Borra el que quieres despejar.',
	'engine.inputs/required':
		'Llena {terms}. El campo que dejes vacío debe ser uno de estos: {solvable}.',
	'engine.inputs/not-a-number': 'Introduce solo valores numéricos.',
	'engine.inputs/not-integer': 'Introduce un número entero para {terms}.',
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
	'converter.showAllDimension': 'Mostrar todas las unidades con esta dimensión (+{count})',
	'converter.showAllDimensionHint':
		'Añade unidades de otras magnitudes con la misma dimensión: convertibles numéricamente, físicamente distintas.',

	'meta.search': 'Busca cualquier unidad, magnitud, constante o ecuación de la wiki de Equreka.',
	'search.title': 'Buscar',
	'search.lead': 'Busca por nombre, símbolo o alias — con o sin acentos.',
	'search.placeholder': 'Constantes, variables, unidades, ecuaciones o fórmulas...',
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

	'meta.paths':
		'Rutas de aprendizaje guiadas por la wiki de Equreka — pasos ordenados con autoevaluaciones; el progreso se queda en este dispositivo.',
	'paths.title': 'Rutas de aprendizaje',
	'paths.lead':
		'{count} rutas guiadas. Cada una recorre unas cuantas entradas en orden, con transiciones y preguntas de autoevaluación. El progreso se guarda en este dispositivo.',
	'meta.path': '{name} — ruta de aprendizaje de nivel {level} en {count} pasos.',
	'level.intro': 'Introductorio',
	'level.intermediate': 'Intermedio',
	'level.advanced': 'Avanzado',
	'path.steps': '{count} pasos',
	'path.minutes': '{count} min',
	'path.prerequisites': 'Antes de esta ruta',
	'path.progress': '{done} de {total} pasos completados',
	'path.progressAria': 'Progreso de la ruta',
	'path.completed': 'Completada',
	'path.markDone': 'Marcar paso como completado',
	'path.markUndone': 'Marcar paso como pendiente',
	'path.stepOf': 'Paso {n} de {total}',
	'path.prev': 'Paso anterior',
	'path.next': 'Paso siguiente',
	'path.backToPath': 'Volver a la ruta',
	'path.reset': 'Reiniciar progreso',
	'path.check': 'Ponte a prueba',
	'path.reveal': 'Mostrar la respuesta',
	'path.openEntry': 'Abrir la entrada',
	'path.kind.entry': 'Entrada',
	'path.kind.prose': 'Lectura',
	'path.kind.check': 'Autoevaluación',
	'offline.outline': 'Pasos',

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
	'favorites.importedProgress': 'Se importaron {count} pasos completados de rutas.',
	'favorites.transferNote':
		'Las exportaciones también incluyen tu progreso en las rutas de aprendizaje.',

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
	'settings.numberFormat': 'Formato de resultados',
	'settings.numberFormat.readable': 'Legible',
	'settings.numberFormat.scientific': 'Científico (precisión completa)',
	'settings.favorites': 'Favoritos',
	'settings.version': 'Versión',

	'license.title': 'Licencia',
	'license.content':
		'Las descripciones, los datos y las rutas de aprendizaje se publican bajo {license}. Si los reutilizas, da crédito a «{attribution}» y enlaza al repositorio.',
	'license.code':
		'El código fuente es software libre bajo la {license}, versión 3 o cualquier versión posterior.',
	'license.repository':
		'Código fuente, textos completos de las licencias y colaboradores: {repository}',
	'license.textAdaptedFrom': 'Texto adaptado de {source} ({license}).',
	'license.publicDomain': 'dominio público',

	'nav.home': 'Inicio',
	'mobile.notFound.title': 'Pantalla no encontrada',
	'mobile.notFound.lead': 'Ese enlace no lleva a ningún lugar en esta versión.',
	'mobile.notFound.home': 'Ir al inicio',
	'mobile.entry.notFound': 'Esta entrada no está en la biblioteca incluida.',
	'mobile.entry.count': '{count} entradas',
	'mobile.entry.related': 'Relacionado',
	'mobile.search.start': 'Escribe para buscar por nombre, símbolo o alias.',
	'mobile.search.building': 'Construyendo el índice de búsqueda…',
	'mobile.transfer.exportFailed': 'No se pudieron exportar los favoritos.',
	'mobile.transfer.shareUnavailable': 'Compartir no está disponible en este dispositivo.',
	'mobile.category.empty': 'Todavía no hay nada en esta categoría.',
	'mobile.picker.filter': 'Filtrar…',
	'mobile.picker.close': 'Cerrar',
	'mobile.check.hide': 'Ocultar la respuesta',
	'mobile.math.unavailable': 'Las fórmulas renderizadas no están disponibles en esta versión.',
};
