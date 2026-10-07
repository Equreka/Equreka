# Spanish glossary

Conventions for every `<slug>.es.yaml` sidecar. Companion to the [style guide](style-guide.md), whose length, structure, tone and TeX rules apply to Spanish unchanged.

**Sources.** Unit and quantity names follow the Centro Español de Metrología, [*El Sistema Internacional de Unidades*, 9.ª ed. (2019)](https://www.cem.es/sites/default/files/documentos/2022-08/30362_elsistemainternacionaldeunidades_web_0.pdf), the official Spanish edition of the SI Brochure, and the RAE (*Diccionario de la lengua española*, *Diccionario panhispánico de dudas*). CEM's [*Así NO se escribe*](https://www.cem.es/sites/default/files/documentos/2021-09/Asi_no_se_escribe_web20210924.pdf) covers symbol writing. The **Source** column says where each form was confirmed: `CEM` (the brochure's text, checked 2026-10-06), `sidecar` (already shipped), `usage` (standard textbook usage; the Spanish verifier confirms it against a fetched source before it ships).

## Conventions

- **Neutral, natural Spanish** for readers in Spain and Latin America. Where usage splits, prose takes the CEM form and the other form goes in the entity's `aliases` (aliases are not localized, so they live in the entity file).
- **Regional unit names only in `aliases`**: *joule, watt, ampere, volt, ohm, coulomb, farad, hertz, henry, electronvolt, kilowatt*, and *capacitancia*. `node scripts/content/roadmap.mjs --entry <collection>/<slug>` lists any lowercase regional unit name left in a sidecar (`regional`); a rewrite is not done until the list is empty. A capitalized person's name stays legal: *efecto Joule*, *ley de Ohm*.
- **Sentence case**: *Segunda ley de Newton*, *Ley de Ohm*, *Constante de Planck*, *Teorema de Pitágoras*. Mid-sentence: *la ley de Ohm*, *el principio de Pascal*.
- **Unit names are lowercase common nouns**, also when they come from a person (*el newton*, *dos pascales*); *grado Celsius* keeps the capital of the scale.
- **Plurals** follow the shipped sidecars (*metros, amperios, hercios, litros, faradios, gramos, julios, culombios, ohmios, vatios, segundos, moles, newtons, voltios, pascales*). For a new `namePlural`, confirm the RAE plural in a fetched source; *siemens* and *lux* are invariable. A name of two nouns where the second qualifies the first pluralizes only the first ([RAE, *El plural de los compuestos*](https://www.rae.es/buen-uso-espa%C3%B1ol/el-plural-de-los-compuestos)): *kilogramos fuerza*, *libras fuerza*. The RAE attests *kilovatios hora* ([*Diccionario del estudiante*](https://www.rae.es/diccionario-estudiante/kilovatio)), the same first-noun pattern as *años luz*; *vatios hora* and *amperios hora* follow it. Other product names (*newton metro*, *kilogramo metro por segundo*) have no confirmed plural yet: write them in the singular (*se expresa con el newton metro*) until a fetched source settles it.
- **Compound unit names** follow CEM: *metro por segundo*, *metro por segundo al cuadrado*, *julio por kilogramo y kelvin*, *vatio por metro y kelvin*, *newton metro*, *pascal segundo*.
- **Symbols are international** and never translated or abbreviated differently: `s` (not *seg*), `h` (not *hr*), `min`, `L` or `l`.
- **Decimal separator: the point**, in both languages. CEM writes the comma, which the 22nd CGPM (2003, Resolution 10) allows alongside the point; this project uses the point so every `$…$` fragment is byte-identical to the English one and matches what the calculator accepts. Digit groups use a thin space (`101\,325`), never a point or a comma, which CEM also prescribes.
- **Math is byte-identical** to the English entity: copy every `$…$` and `$$…$$` fragment exactly, macros included. A fragment changes only if its notation is itself localized, which no current entry needs.
- **Isotopes** take a hyphen between the element name and the mass number, as in English and IUPAC nomenclature: *carbono-12*, *radio-226*, *cesio-133*.
- **Path register**: path prose (`body`, `note`, `answer`) addresses the reader with the second-person singular imperative and no pronoun (*Fíjate*, *Compara*, *Despéjala*), as the shipped paths do; never the impersonal *Obsérvese* or *Conviene*, never *usted*.
- **Unitless values in mathematics entries** (ratios, counts, probabilities) are *números puros*; *magnitud adimensional* stays the metrological term for a physical quantity of dimension one.
- **Typography**: accents on capitals (*Óptica*), opening `¿` and `¡`, ordinals *9.ª*, angle quotes *«…»* when a quotation is unavoidable.
- **No calques**:

  | Avoid | Write |
  | --- | --- |
  | jugar un rol / un papel clave | intervenir en, determinar, ser necesario para |
  | asumir (to assume) | suponer |
  | eventualmente (eventually) | finalmente, con el tiempo |
  | evidencia (evidence) | pruebas, datos |
  | envolver (to involve) | implicar |
  | significante (significant) | significativo, apreciable |
  | masivo (massive) | de gran masa |
  | remover (to remove) | eliminar, quitar |
  | a nivel de | en |
  | en orden a | para |
  | decaimiento radiactivo | desintegración radiactiva |
  | resolver por x (solve for x) | despejar x |

- **Banned**, mirroring the English list: *tú, usted, vosotros, nosotros*; rhetorical questions; *simplemente, obviamente, claramente, por supuesto*; *crucial*, *juega un papel clave*, *cabe destacar*, *es importante señalar*, *vale la pena mencionar*, *en conclusión*; *fundamental* except in its technical sense (*constante fundamental*, *estado fundamental*); emojis, Markdown, HTML, URLs, mentions of Equreka or *esta wiki*.

## Unit names

| English | Spanish (plural) | Source |
| --- | --- | --- |
| metre, kilogram, second | metro (metros), kilogramo, segundo (segundos) | CEM, sidecar |
| ampere | amperio (amperios) | CEM, sidecar |
| kelvin, mole, candela | kelvin (invariable in prose: *300 kelvin*; no plural confirmed), mol (moles), candela | CEM, sidecar (mol) |
| radian, steradian | radián, estereorradián | CEM |
| hertz | hercio (hercios) | CEM, sidecar |
| newton, pascal | newton (newtons), pascal (pascales) | CEM, sidecar |
| joule, watt | julio (julios), vatio (vatios) | CEM, sidecar |
| coulomb, volt | culombio (culombios), voltio (voltios) | CEM, sidecar |
| farad, ohm | faradio (faradios), ohmio (ohmios) | CEM, sidecar |
| siemens, weber, tesla | siemens, weber (no plural confirmed: avoid *webers*), tesla (teslas) | CEM; plural *teslas*: [RAE, *Diccionario del estudiante*](https://www.rae.es/diccionario-estudiante/tesla) |
| henry | henrio | CEM |
| degree Celsius | grado Celsius | CEM |
| lumen, lux | lumen, lux | CEM |
| becquerel, gray, sievert | becquerel (becquerels), gray (grais), sievert (sieverts) | CEM; plural *becquerels*: [RAE, DLE *curio*](https://dle.rae.es/curio); *sieverts*: [RAE, *El plural de los préstamos*](https://www.rae.es/buen-uso-espa%C3%B1ol/el-plural-de-los-pr%C3%A9stamos-de-otras-lenguas); *grais*: Fundéu BBVA recommendation ([COPE reprint](https://www.cope.es/actualidad/cultura/noticias/fundeu-bbva-sievert-adaptacion-espanol-20180315_183912)), rare in the press |
| litre, gram | litro (litros), gramo (gramos) | CEM, sidecar |
| minute, hour, day | minuto, hora, día | CEM |
| degree, arcminute, arcsecond | grado, minuto de arco, segundo de arco | CEM (Table 8 names them grado, minuto, segundo; add *de arco* in prose to avoid ambiguity) |
| hectare, tonne | hectárea, tonelada | CEM |
| astronomical unit | unidad astronómica | CEM |
| dalton, electronvolt | dalton, electronvoltio | CEM |
| neper, bel, decibel | neper, belio, decibelio | CEM |
| erg, dyne, poise | ergio, dina, poise | CEM |
| curie | curie (curies) | CEM; plural per [RAE, *El plural de los préstamos*](https://www.rae.es/buen-uso-espa%C3%B1ol/el-plural-de-los-pr%C3%A9stamos-de-otras-lenguas) (loans ending in a vowel add *-s*) |
| kilowatt-hour, watt-hour | kilovatio hora (kilovatios hora), vatio hora (vatios hora) | [RAE, *Diccionario del estudiante*](https://www.rae.es/diccionario-estudiante/kilovatio) (*362 kilovatios hora*); plural on the first noun per *El plural de los compuestos* |
| ampere-hour | amperio hora (amperios hora) | usage; plural on the first noun per *El plural de los compuestos*, as *kilovatios hora* |
| calorie, kilocalorie | caloría, kilocaloría | usage |
| bar, torr | bar (bares), torr | usage |
| standard atmosphere | atmósfera estándar (*atmósfera normal* in `aliases`) | usage |
| millimetre of mercury | milímetro de mercurio | usage |
| joule per mole | julio por mol (julios por mol) | CEM (Table 6); plural on the first noun, as CEM's *julios por kilogramo* |
| joule per mole kelvin | julio por mol y kelvin (*julio por mol kelvin* in `aliases`) | CEM (Table 6) |
| kilogram per mole, gram per mole | kilogramo por mol, gramo por mol | usage |
| cubic metre per mole, litre per mole | metro cúbico por mol, litro por mol | usage |
| coulomb per mole | culombio por mol | usage |
| ångström | ángstrom (ángstroms; *ångström* in `aliases`) | RAE (DLE headword *ángstrom*), Wikidata Q81454 `es` label |
| light-year, parsec | año luz (años luz), pársec | usage |
| knot, nautical mile, mile | nudo, milla náutica, milla | usage |
| foot, inch, yard | pie, pulgada, yarda | usage |
| pound, ounce, stone | libra, onza, stone | usage |
| gallon, pint, quart | galón, pinta, cuarto de galón | usage |
| short ton, long ton | tonelada corta, tonelada larga (the SI tonne is *tonelada métrica* only beside them, to tell the three apart; *tonelada* elsewhere) | usage |
| hundredweight, quarter, furlong, chain, rod, gill, bushel | kept in English: *hundredweight* (cwt, invariable), *quarter*, *furlong*, *chain*, *rod*, *gill*, *bushel*; never *quintal* (a Spanish 100-pound or 100 kg unit) or *vara* (a distinct Spanish length) | usage |
| dram (avoirdupois) | dracma | usage |
| foot-pound (foot pound-force) | pie libra (*pie libra fuerza* in prose when the force must be explicit), no hyphen, as *newton metro* | usage |
| pound-force, kilogram-force | libra fuerza, kilogramo fuerza | usage |
| pound per square inch | libra por pulgada cuadrada | usage |
| horsepower, metric horsepower | caballo de fuerza (hp), caballo de vapor (CV) | usage |
| British thermal unit | unidad térmica británica | usage |
| therm | unidad therm (name kept in English; write *la unidad therm*, no gender settled for bare *therm*) | usage |
| volt per metre, farad per metre, henry per metre | voltio por metro, faradio por metro, henrio por metro | CEM |
| gauss | gauss | usage |
| revolution, revolution per minute | vuelta, revolución por minuto | usage |
| percent | por ciento (the quantity is *porcentaje*) | usage |
| mole per litre | mol por litro (*molar* in `aliases`) | usage |
| week, month, year, decade, century | semana, mes, año, década, siglo | usage |
| degree Fahrenheit, Rankine, Réaumur, Rømer, Delisle, Newton | grado Fahrenheit, grado Rankine, grado Réaumur, grado Rømer, grado Delisle, grado Newton | usage |

Prefix names: *mili* per RAE; *atto* per the DLE entry *atto-* and, with *zetta* and *yotta*, per the CEM translation of the SI Brochure (9th ed., Table 7); the rest unchanged. Prefixed unit names follow the same spelling (*attosegundo*, *zettajulio*, *yottagramo*).

## Terms

### Mechanics and gravitation

| English | Spanish | Source |
| --- | --- | --- |
| magnitude (physical quantity) | magnitud | usage |
| base quantity, base unit, defining constant | magnitud básica, unidad básica, constante definitoria (*unidad base* in `aliases`) | CEM |
| speed | rapidez | usage (CEM's Table 5 says *velocidad* for both; this project keeps the scalar/vector distinction) |
| velocity | velocidad | CEM |
| acceleration | aceleración | CEM |
| displacement | desplazamiento | usage |
| momentum | cantidad de movimiento (*momento lineal* in `aliases`) | usage |
| impulse | impulso | usage |
| weight | peso | usage |
| normal force | fuerza normal | usage |
| friction, coefficient of friction | rozamiento, coeficiente de rozamiento | usage |
| torque | momento de una fuerza (*momento de fuerza*; *torque* in `aliases`) | CEM |
| moment of inertia | momento de inercia | usage |
| angular velocity, angular frequency | velocidad angular, frecuencia angular | CEM |
| angular momentum | momento angular | usage |
| centripetal acceleration | aceleración centrípeta | usage |
| kinetic energy, potential energy | energía cinética, energía potencial | usage |
| work, power | trabajo, potencia | CEM |
| efficiency | rendimiento | usage |
| spring constant | constante elástica | usage |
| stress, strain | tensión mecánica, deformación unitaria | usage |
| Young's modulus | módulo de Young | usage |
| free fall, projectile, range | caída libre, proyectil, alcance | usage |
| inclined plane, lever | plano inclinado, palanca | usage |
| centre of mass | centro de masas | usage |
| elastic collision, inelastic collision | choque elástico, choque inelástico | usage |
| coefficient of restitution | coeficiente de restitución | usage |
| Newton's second law | segunda ley de Newton | usage |
| Newtonian constant of gravitation | constante de gravitación universal | usage |
| atomic mass constant | constante de masa atómica (*constante de masa atómica unificada* in `aliases`) | usage |
| standard acceleration of gravity | aceleración normal de la gravedad (*gravedad normal* in prose after first mention); *standard* is *normal* here but *estándar* in *atmósfera estándar*, a deliberate split that follows each term's usage | CEM |
| gravitational field strength | intensidad del campo gravitatorio | usage |
| escape velocity, orbital period | velocidad de escape, periodo orbital | usage |
| orbital speed | rapidez orbital (scalar: *rapidez*, per the speed row) | usage |

### Fluids, waves and optics

| English | Spanish | Source |
| --- | --- | --- |
| density, mass density | densidad, densidad másica | CEM |
| pressure, gauge pressure | presión, presión manométrica | CEM (presión) |
| force per area (head kind of pressure and stress) | fuerza por unidad de superficie | usage |
| buoyant force | empuje | usage |
| volumetric flow rate | caudal | usage |
| dynamic viscosity | viscosidad dinámica | CEM |
| surface tension | tensión superficial | CEM |
| specific gravity | densidad relativa | usage |
| period, frequency | periodo, frecuencia | CEM (frecuencia) |
| wave speed | rapidez de propagación (scalar: *rapidez*, per the speed row) | usage |
| wavelength, wavenumber | longitud de onda, número de ondas | CEM (número de ondas) |
| amplitude, harmonic, beat | amplitud, armónico, pulsación (also the QUDT Spanish label of angular frequency, so *pulsación* is an alias of `magnitudes/angular-frequency` too) | usage |
| simple harmonic motion | movimiento armónico simple | usage |
| sound intensity level | nivel de intensidad sonora | usage |
| refractive index | índice de refracción | usage |
| focal length, magnification | distancia focal, aumento | usage |
| lens, mirror | lente (f.), espejo | usage |
| critical angle | ángulo límite | usage |
| diffraction grating | red de difracción | usage |
| luminous flux, luminous intensity | flujo luminoso, intensidad luminosa | CEM |
| illuminance, luminance | iluminancia, luminancia | CEM (luminancia) |
| irradiance | irradiancia | CEM |
| optical power | potencia óptica | usage |

### Thermodynamics

| English | Spanish | Source |
| --- | --- | --- |
| heat, temperature | calor, temperatura | usage |
| thermodynamic temperature | temperatura termodinámica | CEM |
| heat capacity | capacidad calorífica | CEM |
| specific heat capacity | capacidad calorífica específica (*calor específico* in `aliases`) | CEM |
| specific latent heat | calor latente específico | usage |
| thermal conductivity | conductividad térmica | CEM |
| internal energy, entropy | energía interna, entropía | CEM (entropía) |
| thermal expansion, linear expansion coefficient | dilatación térmica, coeficiente de dilatación lineal | usage |
| ideal gas, ideal gas law | gas ideal, ley de los gases ideales | usage |
| heat engine, Carnot efficiency | máquina térmica, rendimiento de Carnot | usage |
| first law of thermodynamics | primer principio de la termodinámica | usage |

### Electromagnetism

| English | Spanish | Source |
| --- | --- | --- |
| electric charge, electric current | carga eléctrica, corriente eléctrica | CEM |
| potential difference, voltage | diferencia de potencial, tensión eléctrica | usage |
| electromotive force | fuerza electromotriz | usage |
| electrical resistance, resistivity | resistencia eléctrica, resistividad | CEM (resistencia eléctrica) |
| electrical conductance | conductancia eléctrica | CEM |
| capacitance | capacidad eléctrica (*capacitancia* in `aliases`) | CEM |
| capacitor, inductor | condensador, bobina | usage |
| inductance | inductancia | CEM |
| electric field strength | intensidad de campo eléctrico | CEM |
| magnetic flux, magnetic flux density | flujo magnético, densidad de flujo magnético | CEM |
| permittivity, permeability | permitividad, permeabilidad | CEM |
| vacuum electric permittivity | permitividad eléctrica del vacío | usage |
| vacuum magnetic permeability | permeabilidad magnética del vacío | CEM |
| relative permittivity, dielectric constant | permitividad relativa, constante dieléctrica | usage |
| dielectric strength | rigidez dieléctrica | usage |
| magnetic susceptibility | susceptibilidad magnética | usage |
| magnetic field strength | intensidad de campo magnético | usage |
| fluxmeter | fluxómetro | usage |
| Coulomb constant | constante de Coulomb | usage (Wikidata Q9855158 `es` label) |
| reactance, impedance | reactancia, impedancia | usage |
| RMS value | valor eficaz | usage |
| alternating current, direct current | corriente alterna, corriente continua | usage |
| transformer | transformador | usage |
| Ohm's law, Coulomb's law, Faraday's law | ley de Ohm, ley de Coulomb, ley de Faraday | usage |

### Modern and nuclear physics

| English | Spanish | Source |
| --- | --- | --- |
| speed of light in vacuum | velocidad de la luz en el vacío (the constant's name, so *velocidad*, not *rapidez*) | CEM |
| photon, photoelectric effect | fotón, efecto fotoeléctrico | usage |
| work function, threshold frequency | función de trabajo, frecuencia umbral | usage |
| stopping potential | potencial de frenado | usage |
| time dilation, length contraction | dilatación del tiempo, contracción de la longitud | usage |
| Lorentz factor | factor de Lorentz | usage |
| half-life | semivida (*periodo de semidesintegración* is the accepted synonym: name it once in prose and add it to `aliases`) | usage |
| decay constant, activity | constante de desintegración, actividad | CEM (actividad) |
| binding energy, mass defect | energía de enlace, defecto de masa | usage |
| absorbed dose, equivalent dose | dosis absorbida, dosis equivalente | CEM |

### Chemistry

| English | Spanish | Source |
| --- | --- | --- |
| amount of substance | cantidad de sustancia | CEM, sidecar |
| molar mass, molar volume | masa molar, volumen molar | CEM (masa molar) |
| molar energy, molar entropy | energía molar, entropía molar | CEM |
| amount concentration, molarity | concentración de cantidad de sustancia, concentración molar (*molaridad* in `aliases`) | CEM |
| mass concentration | concentración másica | CEM |
| molality, mole fraction | molalidad, fracción molar | usage |
| mass percent | porcentaje en masa | usage |
| solution, solute, solvent | disolución, soluto, disolvente | usage |
| solutions (branch) | Disoluciones y concentración | usage |
| dilution, percent yield | dilución, rendimiento porcentual | usage |
| limiting reagent | reactivo limitante | usage |
| partial pressure | presión parcial | usage |
| acid dissociation constant | constante de acidez | usage |
| ion product of water | producto iónico del agua | usage |
| titration | valoración | usage |
| buffer solution | disolución amortiguadora | usage |
| enthalpy, Gibbs energy | entalpía, energía de Gibbs | usage |
| temperature at which the Gibbs energy change is zero | temperatura a la que la variación de energía de Gibbs se anula (never *temperatura de inversión*, which names the Joule-Thomson inversion temperature) | [OpenStax *Química 2ed*, 16.4](https://openstax.org/books/qu%C3%ADmica-2ed/pages/16-4-energia-libre) |
| molar gas constant | constante molar de los gases | usage |
| reaction rate, rate constant, rate law | velocidad de reacción, constante de velocidad, ley de velocidad | usage |
| activation energy | energía de activación | usage |
| equilibrium constant, solubility product | constante de equilibrio, producto de solubilidad | usage |
| cell potential, standard electrode potential | potencial de la celda, potencial estándar de electrodo | usage |
| galvanic cell, electrolytic cell, fuel cell | celda galvánica, celda electrolítica, celda de combustible (*pila* in `aliases`) | usage |
| electrolysis | electrólisis | usage |

### Mathematics

| English | Spanish | Source |
| --- | --- | --- |
| percentage, proportion | porcentaje, proporción | usage |
| simple interest, compound interest, principal | interés simple, interés compuesto, capital | usage |
| interest rate | tasa de interés (*tipo de interés* in `aliases`); likewise *tasa impositiva*, not *tipo impositivo* | usage |
| effective annual rate | tasa efectiva anual | usage |
| annuity | anualidad (*renta* as the synonym, named once: *una anualidad o renta*) | usage |
| cost | costo (*coste* in `aliases`) | usage |
| markup (on cost), margin (on selling price) | recargo, margen: distinct ratios, never interchanged (*margen de ganancia* and *markup* in `aliases` of the markup entry) | usage |
| quadratic formula, discriminant, root | fórmula general de segundo grado, discriminante, raíz | usage |
| slope, y-intercept | pendiente, ordenada en el origen | usage |
| sequence, series | sucesión, serie | usage |
| arithmetic progression, geometric progression | progresión aritmética, progresión geométrica: *progresión* for any sequence defined by a constant difference or ratio, *sucesión* only for a generic sequence | usage |
| standard form (of a quadratic equation) | forma general | usage |
| natural logarithm | logaritmo natural (*logaritmo neperiano* in `aliases`) | usage |
| mean, standard deviation, z-score | media, desviación típica, puntuación z | usage |
| combinations, permutations | combinaciones, permutaciones (many Spanish texts call an ordered selection of k of n objects *variaciones sin repetición* and keep *permutaciones* for k = n: say so once in the entry and keep *variaciones* in `aliases`) | usage |
| complementary event, mutually exclusive events | suceso contrario (*suceso complementario*), sucesos incompatibles (*mutuamente excluyentes* as the synonym) | usage |
| conditional probability, marginal probability | probabilidad condicionada, probabilidad marginal (Bayesian *evidence* is *probabilidad marginal*, never *evidencia*) | usage |
| hypotenuse, leg | hipotenusa, cateto | sidecar |
| perimeter, area, volume, surface area | perímetro, área, volumen, área total | usage |
| radius, diameter | radio, diámetro | sidecar (radio) |
| circle (region), circle (curve) | círculo, circunferencia: *área del círculo*, *longitud de la circunferencia* | usage |
| arc length, circular sector | longitud de arco, sector circular | usage |
| law of sines, law of cosines | teorema del seno, teorema del coseno | usage |
| Pythagorean theorem | teorema de Pitágoras | usage |
| plane angle, solid angle | ángulo plano, ángulo sólido | CEM |
