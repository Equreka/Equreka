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
  | contrapartida (counterpart) | análogo, equivalente (*el análogo rotacional*) |

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
| erg, dyne, poise | ergio, dina, poise (poises) | CEM; plural *poises* per [RAE, *El plural de los préstamos*](https://www.rae.es/buen-uso-espa%C3%B1ol/el-plural-de-los-pr%C3%A9stamos-de-otras-lenguas) (loans ending in a vowel add *-s*, as *curies*) |
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
| square centimetre, square millimetre, square kilometre | centímetro cuadrado, milímetro cuadrado, kilómetro cuadrado (plural on both words: *centímetros cuadrados*) | Wikidata [Q2489298](https://www.wikidata.org/wiki/Q2489298), [Q2737347](https://www.wikidata.org/wiki/Q2737347), [Q712226](https://www.wikidata.org/wiki/Q712226) `es` labels (Q712226 alias *kilómetros cuadrados*); CEM 5.2 (*mm cuad.* rejected for *milímetro cuadrado*) |
| square foot, square inch, square yard, square mile | pie cuadrado, pulgada cuadrada, yarda cuadrada, milla cuadrada (pies cuadrados, pulgadas cuadradas, yardas cuadradas, millas cuadradas) | Wikidata [Q857027](https://www.wikidata.org/wiki/Q857027), [Q1063786](https://www.wikidata.org/wiki/Q1063786), [Q1550511](https://www.wikidata.org/wiki/Q1550511), [Q232291](https://www.wikidata.org/wiki/Q232291) `es` labels (aliases *pies cuadrados*, *millas cuadradas*) |
| foot per second, foot per second squared | pie por segundo, pie por segundo al cuadrado (pies por segundo; *al cuadrado* as CEM's *metro por segundo al cuadrado*) | Wikidata [Q748716](https://www.wikidata.org/wiki/Q748716) `es` label and alias *pies por segundo* |
| standard gravity (unit of acceleration) | gravedad normal (*gravedad estándar*, *fuerza g* in `aliases`), as in the *standard acceleration of gravity* row | CEM, Appendix 1, 3rd CGPM 1901 (*aceleración normal de la gravedad*); Wikidata [Q13400897](https://www.wikidata.org/wiki/Q13400897) `es` alias *gravedad estándar*; Wikidata [Q284602](https://www.wikidata.org/wiki/Q284602) `es` label *fuerza g* |
| gal, milligal | gal (gales), miligal | CEM (Table 8, *gal*); [RAE, DLE *gal*](https://dle.rae.es/gal); plural per [RAE, DPD *plural* 1.7a](https://www.rae.es/dpd/plural) (monosyllables ending in *-l* add *-es*) |
| pound-force foot (torque) | libra fuerza pie, no hyphen, as *newton metro* (*libra-pie*, the Wikidata label, in `aliases`); plural unconfirmed, write it in the singular; the energy unit is the *pie libra* row | Wikidata [Q16859309](https://www.wikidata.org/wiki/Q16859309) `es` label *libra-pie*; CEM compound pattern |
| horsepower, metric horsepower | caballo de fuerza (hp), caballo de vapor (CV) | usage |
| British thermal unit | unidad térmica británica | usage |
| therm | unidad therm (name kept in English; write *la unidad therm*, no gender settled for bare *therm*) | usage |
| volt per metre, farad per metre, henry per metre | voltio por metro, faradio por metro, henrio por metro | CEM |
| gauss | gauss | usage |
| revolution, revolution per minute | vuelta, revolución por minuto | usage |
| percent | por ciento (the quantity is *porcentaje*) | usage |
| mole per litre | mol por litro (*molar* in `aliases`) | usage |
| mole per litre second, mole per cubic metre second | mol por litro y segundo, mol por metro cúbico y segundo (moles por litro y segundo, moles por metro cúbico y segundo; *y* joins the denominators, as CEM's *julio por kilogramo y kelvin*) | usage |
| calorie per gram degree Celsius | caloría por gramo y grado Celsius (calorías por gramo y grado Celsius) | usage, as the row above |
| International Table calorie | caloría de la tabla internacional (lowercase *tabla*) | Wikidata [Q93814649](https://www.wikidata.org/wiki/Q93814649) `es` label *caloría (tabla internacional)* |
| cubic metre per second | metro cúbico por segundo (metros cúbicos por segundo) | Wikidata [Q794261](https://www.wikidata.org/wiki/Q794261) `es` label |
| litre per second, litre per minute | litro por segundo, litro por minuto (litros por segundo, litros por minuto; plural on the first noun, as *julios por kilogramo*) | Wikidata [Q61996348](https://www.wikidata.org/wiki/Q61996348), [Q107313814](https://www.wikidata.org/wiki/Q107313814) `es` labels; [OpenStax *Física universitaria* vol. 1, 14.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/14-5-dinamicas-de-fluidos) (*litros por minuto*) |
| week, month, year, decade, century | semana, mes, año, década, siglo | usage |
| dioptre | dioptría (dioptrías); EU-permitted, not SI-accepted | [Directive 80/181/EEC, Spanish consolidated text, Annex, Chapter I, 4](https://eur-lex.europa.eu/legal-content/ES/TXT/HTML/?uri=CELEX:01980L0181-20200613); Wikidata [Q193933](https://www.wikidata.org/wiki/Q193933) `es` label |
| degree Fahrenheit, Rankine, Réaumur, Rømer, Delisle, Newton | grado Fahrenheit, grado Rankine, grado Réaumur, grado Rømer, grado Delisle, grado Newton | usage |
| reciprocal second | segundo inverso (segundos inversos; *segundo recíproco* in `aliases`) | Wikidata [Q6137407](https://www.wikidata.org/wiki/Q6137407) `es` label |
| kilogram per metre, gram per metre | kilogramo por metro, gramo por metro (kilogramos por metro, gramos por metro; plural on the first noun) | Wikidata [Q25999243](https://www.wikidata.org/wiki/Q25999243), [Q107460866](https://www.wikidata.org/wiki/Q107460866) `es` labels |
| part per million | parte por millón (partes por millón) | Wikidata [Q21006887](https://www.wikidata.org/wiki/Q21006887) `es` label; [OpenStax *Química 2ed*, 3.4](https://openstax.org/books/qu%C3%ADmica-2ed/pages/3-4-otras-unidades-para-las-concentraciones-de-las-soluciones) |
| part per billion | parte por mil millones (partes por mil millones); never *parte por billón* in prose, because *billón* is 10^12 in Spanish (it stays in `aliases` for search, as the Wikidata `es` label) | [RAE, DPD, *billón*](https://www.rae.es/dpd/bill%C3%B3n); [OpenStax *Química 2ed*, 3.4](https://openstax.org/books/qu%C3%ADmica-2ed/pages/3-4-otras-unidades-para-las-concentraciones-de-las-soluciones) (*partes por mil millones*); Wikidata [Q2055118](https://www.wikidata.org/wiki/Q2055118) |

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
| deceleration (an everyday word for the size of a braking acceleration, not a separate quantity) | deceleración | sidecar (`magnitudes/acceleration`) |
| size of a vector quantity; size of a signed scalar | módulo; valor absoluto (never *tamaño* for either) | usage |
| level ground, level road | terreno llano, carretera llana | sidecar |
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
| effort, load (of a lever); effort arm, load arm; fulcrum | potencia (the applied force, never mechanical power: term label *Potencia (fuerza aplicada)*), resistencia (term label *Resistencia (fuerza que se vence)*, distinct from *resistencia eléctrica*); brazo de potencia, brazo de resistencia; fulcro (*punto de apoyo*) | [Fisicalab, *Ley de la palanca*](https://www.fisicalab.com/apartado/ley-palanca) |
| lever arm (perpendicular distance from the axis to the line of action) | brazo de palanca | [OpenStax *Física universitaria* vol. 1, 10.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/10-6-torque) |
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
| escape speed (term label of the escape velocity) | rapidez de escape (the entry name stays *velocidad de escape*) | usage, per the speed row |
| distance between centres (gravitation term label) | distancia entre centros | usage |
| Kepler's third law, semi-major axis (of an orbit) | tercera ley de Kepler, semieje mayor | [OpenStax *Física universitaria* vol. 1, 13.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/13-5-leyes-del-movimiento-planetario-de-kepler) |
| net force | fuerza neta | [OpenStax *Física universitaria* vol. 1, 6.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/6-1-resolucion-de-problemas-con-las-leyes-de-newton) |
| inertial frame of reference | sistema de referencia inercial (*marco de referencia inercial*, the OpenStax form, in `aliases`) | usage; *marco*: [OpenStax *Física universitaria* vol. 1, 5.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/5-2-primera-ley-de-newton) |
| static friction, kinetic friction | rozamiento estático, rozamiento cinético (extends the friction row; *fricción estática*, *fricción dinámica* in `aliases`) | usage; *fricción estática*: [OpenStax *Física universitaria* vol. 1, 6.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/6-3-fuerza-centripeta) |
| tension (of a string or cable) | tensión (*tensión de la cuerda*; distinct from *tensión mecánica*, stress, and *tensión eléctrica*, voltage) | [OpenStax *Física universitaria* vol. 1, 6.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/6-1-resolucion-de-problemas-con-las-leyes-de-newton) |
| Atwood machine, pulley | máquina de Atwood, polea | [OpenStax *Física universitaria* vol. 1, 6.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/6-1-resolucion-de-problemas-con-las-leyes-de-newton) |
| lift (elevator), bathroom scale | ascensor, báscula (*elevador* in `aliases`) | [OpenStax *Física universitaria* vol. 1, 6.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/6-1-resolucion-de-problemas-con-las-leyes-de-newton) (both *ascensor* and *elevador*, and *báscula de baño*) |
| apparent weight | peso aparente | Wikidata [Q3900737](https://www.wikidata.org/wiki/Q3900737) `es` label |
| centripetal force | fuerza centrípeta | [OpenStax *Física universitaria* vol. 1, 6.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/6-3-fuerza-centripeta) |
| banked curve, unbanked curve | curva con peralte, curva sin peralte | [OpenStax *Física universitaria* vol. 1, 6.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/6-3-fuerza-centripeta) |
| spring, Hooke's law, equilibrium position | resorte (*muelle* in `aliases`), ley de Hooke, posición de equilibrio | [OpenStax *Física universitaria* vol. 1, 15.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/15-1-movimiento-armonico-simple) |
| pendulum bob | lenteja (de un péndulo) | [Universidad de Sevilla, *Rapidez y tensión de un péndulo*](http://laplace.us.es/wiki/index.php/Rapidez_y_tensi%C3%B3n_de_un_p%C3%A9ndulo); [UNICEN, *Péndulo simple*](https://users.exa.unicen.edu.ar/catedras/fisexp1/files/2013%20Grigera-Lestani-Vera-Pendulo%20simple.pdf) |
| work-energy theorem | teorema de trabajo-energía (*teorema de la energía cinética*, *teorema de las fuerzas vivas*, *teorema del trabajo y la energía* in `aliases`) | [OpenStax *Física universitaria* vol. 1, 7.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/7-3-teorema-de-trabajo-energia) |
| average power, instantaneous power | potencia media, potencia instantánea | [OpenStax *Física universitaria* vol. 1, 7.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/7-4-potencia) |
| elastic potential energy, gravitational potential energy | energía potencial elástica, energía potencial gravitatoria (*gravitacional*, the OpenStax form, in `aliases`; *gravitatoria* matches *campo gravitatorio*) | [OpenStax *Física universitaria* vol. 1, 8.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/8-1-energia-potencial-de-un-sistema) |
| mechanical energy, conservation of mechanical energy | energía mecánica, conservación de la energía mecánica | [OpenStax *Física universitaria* vol. 1, 8.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/8-3-conservacion-de-la-energia) |
| impulse-momentum theorem | teorema del impulso (*teorema del impulso mecánico*; *teorema del momento-impulso*, the OpenStax form, in `aliases`) | [Educaplus, *Teorema del impulso mecánico*](https://www.educaplus.org/momentolineal/teorema_impulso.html); [OpenStax *Física universitaria* vol. 1, 9.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/9-2-impulso-y-colisiones) |
| perfectly inelastic collision | choque perfectamente inelástico (*colisión perfectamente inelástica*, *choque plástico* in `aliases`) | Wikidata [Q2074917](https://www.wikidata.org/wiki/Q2074917) `es` alias; [OpenStax *Física universitaria* vol. 1, 9.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/9-4-tipos-de-colisiones) |
| recoil, recoil velocity | retroceso, velocidad de retroceso | Wikidata [Q749601](https://www.wikidata.org/wiki/Q749601) `es` label |
| barycentre (centre of mass of two bodies) | baricentro (prose only; the term stays *centro de masas*) | usage |
| rigid body | sólido rígido (*cuerpo rígido*, the OpenStax form and the Wikidata `es` label, in `aliases`) | sidecar (the shipped magnitudes and equations); Wikidata [Q192788](https://www.wikidata.org/wiki/Q192788) `es` alias; *cuerpo rígido*: [OpenStax *Física universitaria* vol. 1, 10.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/10-4-momento-de-inercia-y-energia-cinetica-rotacional) |
| torque after its first mention | *momento de fuerza* (the variant of the torque row) or *momento de las fuerzas*; each sidecar names *momento de una fuerza* once, and a bare *momento* never stands next to *momento de inercia* or *momento angular* | usage (collision with the moment of inertia and angular momentum rows) |
| anticlockwise, clockwise (sign of a rotation) | sentido contrario a las agujas del reloj, sentido de las agujas del reloj, *visto desde el extremo positivo del eje*; never *antihorario* in prose | usage |
| angular displacement, angular position, angular acceleration, tangential acceleration | desplazamiento angular, posición angular, aceleración angular, aceleración tangencial | [OpenStax *Física universitaria* vol. 1, 10.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/10-1-variables-rotacionales); [OpenStax *Física universitaria* vol. 1, 10.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/10-2-rotacion-con-aceleracion-angular-constante) |
| point mass, solid cylinder, solid sphere, thin rod | masa puntual, cilindro macizo, esfera maciza, varilla delgada | [OpenStax *Física universitaria* vol. 1, 10.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/10-5-calcular-momentos-de-inercia) (*masa puntual*, *varilla delgada*); [OpenStax *Física universitaria* vol. 1, 10.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/10-4-momento-de-inercia-y-energia-cinetica-rotacional) (*esfera maciza*); *cilindro macizo*: usage |
| parallel axis theorem | teorema del eje paralelo (*teorema de Steiner*, the Wikidata `es` label, and *teorema de los ejes paralelos* in `aliases`) | [OpenStax *Física universitaria* vol. 1, 10.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/10-5-calcular-momentos-de-inercia); Wikidata [Q828284](https://www.wikidata.org/wiki/Q828284) |
| rotational kinetic energy | energía cinética de rotación (*energía cinética rotacional*, the OpenStax form and the Wikidata `es` label, in `aliases`) | sidecar (`magnitudes/kinetic-energy`, `magnitudes/moment-of-inertia`); [OpenStax *Física universitaria* vol. 1, 10.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/10-4-momento-de-inercia-y-energia-cinetica-rotacional); Wikidata [Q2140940](https://www.wikidata.org/wiki/Q2140940) |
| normal stress; tensile, compressive | tensión normal (*esfuerzo normal* in `aliases`); de tracción, de compresión | Wikidata [Q11425837](https://www.wikidata.org/wiki/Q11425837) `es` label |
| linear strain | deformación unitaria lineal, extending the stress/strain row (*dilatación lineal relativa*, the Wikidata `es` label, in `aliases`) | Wikidata [Q1990546](https://www.wikidata.org/wiki/Q1990546) |
| angle of repose (body on an incline) | ángulo de reposo (*ángulo de rozamiento* only in `aliases`) | Wikidata [Q532078](https://www.wikidata.org/wiki/Q532078) `es` label |
| gravitational potential | potencial gravitatorio (*potencial gravitacional* in `aliases`) | Wikidata [Q1544012](https://www.wikidata.org/wiki/Q1544012) `es` label |
| Schwarzschild radius, event horizon | radio de Schwarzschild, horizonte de sucesos | Wikidata [Q72755](https://www.wikidata.org/wiki/Q72755) `es` label; *horizonte de sucesos*: usage |
| total mechanical energy of an orbit | energía mecánica total de la órbita (*energía orbital* in `aliases`) | usage |

### Fluids, waves and optics

| English | Spanish | Source |
| --- | --- | --- |
| density, mass density | densidad, densidad másica | CEM |
| pressure, gauge pressure | presión, presión manométrica | CEM (presión) |
| absolute pressure | presión absoluta | [OpenStax *Física universitaria* vol. 1, 14.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/14-2-medir-la-presion) |
| hydrostatic pressure | presión hidrostática | Wikidata [Q1149672](https://www.wikidata.org/wiki/Q1149672) `es` alias |
| Pascal's principle, hydraulic press, piston | principio de Pascal (*ley de Pascal* in `aliases`), prensa hidráulica, pistón | [OpenStax *Física universitaria* vol. 1, 14.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/14-3-principio-de-pascal-y-la-hidraulica) |
| Archimedes' principle, fraction submerged, average density | principio de Arquímedes, fracción sumergida, densidad media | [OpenStax *Física universitaria* vol. 1, 14.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/14-4-principio-de-arquimedes-y-flotabilidad) |
| force per area (head kind of pressure and stress) | fuerza por unidad de superficie | usage |
| buoyant force | empuje (*fuerza de flotación*, the OpenStax form, in `aliases`) | usage; *fuerza de flotación*: [OpenStax *Física universitaria* vol. 1, 14.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/14-4-principio-de-arquimedes-y-flotabilidad) |
| volumetric flow rate | caudal (*caudal volumétrico*; *tasa de flujo*, the OpenStax form, and *gasto* in `aliases`) | usage; *tasa de flujo*: [OpenStax *Física universitaria* vol. 1, 14.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/14-5-dinamicas-de-fluidos) |
| mass flow rate | caudal másico (OpenStax writes *tasa de flujo de masa*) | usage; OpenStax form: [*Física universitaria* vol. 1, 14.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/14-5-dinamicas-de-fluidos) |
| continuity equation | ecuación de continuidad | Wikidata [Q217219](https://www.wikidata.org/wiki/Q217219) `es` label; [OpenStax *Física universitaria* vol. 1, 14.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/14-5-dinamicas-de-fluidos) |
| Torricelli's law, efflux speed | teorema de Torricelli (the Spanish sources' name, while English says *law*; *ley de Torricelli* in `aliases`), rapidez de salida (scalar, per the speed row; *velocidad de salida* in `aliases`) | Wikidata [Q728969](https://www.wikidata.org/wiki/Q728969) `es` label; [A. Franco García, *Física con ordenador* (UPV/EHU), *Vaciado de un depósito*](http://www.sc.ehu.es/sbweb/fisica/fluidos/dinamica/vaciado/vaciado.htm) (*teorema de Torricelli*, *velocidad de salida*) |
| free surface (of a liquid), cross-section (of a pipe) | superficie libre, sección | [A. Franco García, *Física con ordenador* (UPV/EHU), *Vaciado de un depósito*](http://www.sc.ehu.es/sbweb/fisica/fluidos/dinamica/vaciado/vaciado.htm) |
| dynamic viscosity | viscosidad dinámica | CEM |
| kinematic viscosity | viscosidad cinemática | usage |
| surface tension | tensión superficial | CEM |
| specific gravity | densidad relativa (*gravedad específica* in `aliases`; never *peso específico*, which is weight per unit volume) | Wikidata [Q10972285](https://www.wikidata.org/wiki/Q10972285) `es` label and alias |
| period, frequency | periodo, frecuencia | CEM (frecuencia) |
| wave speed | rapidez de propagación (scalar: *rapidez*, per the speed row) | usage |
| wavelength, wavenumber | longitud de onda, número de ondas (*número de onda* in `aliases`) | CEM (número de ondas); *número de onda*: Wikidata [Q192510](https://www.wikidata.org/wiki/Q192510) `es` label |
| angular wavenumber | número de ondas angular (named in prose only; *número de onda circular* is the Wikidata [Q30338487](https://www.wikidata.org/wiki/Q30338487) `es` label) | usage |
| amplitude, harmonic | amplitud, armónico | usage |
| harmonic number | número de armónico (*número de armónico (impar)* for a pipe closed at one end) | usage |
| beat, beat frequency | batimiento, frecuencia de batimiento (*pulsación* and *frecuencia de pulsación* are synonyms, named once and kept in `aliases`; *pulsación* also names angular frequency and is an alias of `magnitudes/angular-frequency`, so never use it as the main term) | [OpenStax *Física universitaria* vol. 1, 17.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/17-6-batimientos); Wikidata [Q106371934](https://www.wikidata.org/wiki/Q106371934) `es` label |
| tuning fork | diapasón | [OpenStax *Física universitaria* vol. 1, 17.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/17-6-batimientos) |
| simple pendulum | péndulo simple | [OpenStax *Física universitaria* vol. 1, 15.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/15-4-pendulos) |
| standing wave, node, antinode, fundamental frequency, overtone, normal modes | onda estacionaria, nodo, antinodo, frecuencia fundamental, sobretono, modos normales | [OpenStax *Física universitaria* vol. 1, 16.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/16-6-ondas-estacionarias-y-resonancia) |
| pipe closed at one end, pipe open at both ends, end correction | tubo cerrado en un extremo, tubo abierto en ambos extremos, corrección en el extremo | [OpenStax *Física universitaria* vol. 1, 17.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/17-5-fuentes-de-sonido-musical) |
| compression, rarefaction (of a sound wave) | compresión, rarefacción (never *enrarecimiento*) | [OpenStax *Física universitaria* vol. 1, 17.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/17-1-ondas-sonoras) |
| speed of sound | rapidez del sonido, also in entry names (per the speed row; the English names say *speed*); *velocidad del sonido*, the OpenStax title form, only in `aliases` | usage; OpenStax form: [OpenStax *Física universitaria* vol. 1, 17.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/17-2-velocidad-del-sonido) |
| adiabatic index | índice adiabático | [OpenStax *Física universitaria* vol. 1, 17.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/17-2-velocidad-del-sonido) |
| Doppler effect, observer, source | efecto Doppler, observador, fuente | [OpenStax *Física universitaria* vol. 1, 17.7](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/17-7-el-efecto-doppler); Wikidata [Q76436](https://www.wikidata.org/wiki/Q76436) `es` label |
| inverse-square law | ley de la inversa del cuadrado (*ley del inverso del cuadrado*, *ley cuadrática inversa* in `aliases`); each entry qualifies the bare name in its `aliases` (*... del sonido*, *... de la luz*) | Wikidata [Q333094](https://www.wikidata.org/wiki/Q333094) `es` label and aliases |
| sound intensity | intensidad del sonido (*intensidad sonora*, *intensidad acústica*, *intensidad de sonido* in `aliases`) | [OpenStax *Física universitaria* vol. 1, 17.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/17-3-intensidad-del-sonido); *intensidad de sonido*: Wikidata [Q1140289](https://www.wikidata.org/wiki/Q1140289) `es` label |
| reference sound intensity, threshold of hearing | intensidad de referencia del sonido, umbral de audición (*intensidad umbral*, the OpenStax form, in `aliases`) | [OpenStax *Física universitaria* vol. 1, 17.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/17-3-intensidad-del-sonido) |
| simple harmonic motion | movimiento armónico simple | usage |
| sound intensity level | nivel de intensidad del sonido, matching *intensidad del sonido* (*nivel de intensidad sonora* in `aliases`) | [OpenStax *Física universitaria* vol. 1, 17.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/17-3-intensidad-del-sonido) |
| refractive index | índice de refracción | usage |
| focal length, magnification | distancia focal, aumento (*aumento óptico* in `aliases`) | usage; *aumento óptico*: Wikidata [Q675287](https://www.wikidata.org/wiki/Q675287) `es` label |
| thin lens equation, mirror equation | ecuación de las lentes delgadas, ecuación de los espejos (*ecuación de lentes* and *ecuación del espejo*, the OpenStax forms, in `aliases`) | usage; OpenStax forms: [OpenStax *Física universitaria* vol. 3, 2.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/2-4-lentes-delgadas), [OpenStax *Física universitaria* vol. 3, 2.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/2-2-espejos-esfericos) |
| object distance, image distance, radius of curvature | distancia del objeto, distancia de la imagen, radio de curvatura | [OpenStax *Física universitaria* vol. 3, 2.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/2-2-espejos-esfericos), [OpenStax *Física universitaria* vol. 3, 2.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/2-4-lentes-delgadas) |
| converging lens, diverging lens, concave mirror, convex mirror | lente convergente, lente divergente, espejo cóncavo, espejo convexo | same pages |
| angle of incidence, angle of refraction, total internal reflection, Snell's law | ángulo de incidencia, ángulo de refracción, reflexión interna total, ley de Snell | [OpenStax *Física universitaria* vol. 3, 1.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/1-3-refraccion), [OpenStax *Física universitaria* vol. 3, 1.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/1-4-reflexion-interna-total) |
| double slit, slit separation, fringe spacing | doble rendija, distancia entre las rendijas, separación entre franjas (*interfranja* in `aliases`) | [OpenStax *Física universitaria* vol. 3, 3.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/3-2-matematicas-de-la-interferencia) (doble rendija, distancia entre las rendijas); fringe spacing: usage |
| lens, mirror | lente (f.), espejo | usage |
| critical angle | ángulo límite (*ángulo crítico*, the OpenStax form, in `aliases`) | usage; OpenStax form: [OpenStax *Física universitaria* vol. 3, 1.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/1-4-reflexion-interna-total) |
| diffraction grating | red de difracción | usage |
| luminous flux, luminous intensity | flujo luminoso, intensidad luminosa | CEM |
| illuminance, luminance | iluminancia, luminancia | CEM (luminancia) |
| irradiance | irradiancia | CEM |
| optical power | potencia óptica | Wikidata [Q559265](https://www.wikidata.org/wiki/Q559265) `es` label |
| luminous efficacy of a source | eficacia luminosa de una fuente (*rendimiento luminoso* in `aliases`) | Wikidata [Q3425218](https://www.wikidata.org/wiki/Q3425218) `es` label and alias |
| Bernoulli's equation, Bernoulli's principle, streamline | ecuación de Bernoulli, principio de Bernoulli, línea de corriente | [OpenStax *Física universitaria* vol. 1, 14.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/14-6-ecuacion-de-bernoulli); Wikidata [Q181328](https://www.wikidata.org/wiki/Q181328) |
| drag force, drag coefficient, Stokes' law | fuerza de arrastre, coeficiente de arrastre, ley de Stokes | [OpenStax *Física universitaria* vol. 1, 6.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/6-4-fuerza-de-arrastre-y-velocidad-limite); Wikidata [Q824561](https://www.wikidata.org/wiki/Q824561) |
| terminal velocity | velocidad límite as the entry name; *rapidez límite* in term labels and prose, per the speed row; *velocidad terminal* in `aliases` | [OpenStax *Física universitaria* vol. 1, 6.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/6-4-fuerza-de-arrastre-y-velocidad-limite); Wikidata [Q614981](https://www.wikidata.org/wiki/Q614981) `es` label |
| drag equation, reference area | ecuación de arrastre, área de referencia (OpenStax says *área transversal*) | Wikidata [Q9300786](https://www.wikidata.org/wiki/Q9300786) `es` label; *área de referencia*: usage |
| Reynolds number, viscous stress | número de Reynolds, tensión viscosa (per the stress row, never *esfuerzo viscoso*) | usage |
| phase constant (simple harmonic motion) | fase inicial (*constante de fase* named once in prose; OpenStax writes *desplazamiento de fase*) | [J. Bosch, Universitat de València, *Movimiento armónico simple (MAS)*](https://www.uv.es/jbosch/PDF/MAS.pdf); OpenStax form: [OpenStax *Física universitaria* vol. 1, 15.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/15-1-movimiento-armonico-simple) |
| displacement in simple harmonic motion | elongación for the relation's name (*Elongación en el movimiento armónico simple*); the term label stays *desplazamiento desde el equilibrio*, the general word, and the prose uses both | [J. Bosch, Universitat de València, *Movimiento armónico simple (MAS)*](https://www.uv.es/jbosch/PDF/MAS.pdf) |
| maximum speed, maximum acceleration (simple harmonic motion) | rapidez máxima (per the speed row; *velocidad máxima*, the OpenStax form, in `aliases`), aceleración máxima | [OpenStax *Física universitaria* vol. 1, 15.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/15-1-movimiento-armonico-simple) (*velocidad máxima*) |
| linear mass density | densidad lineal de masa (*densidad lineal*, the OpenStax form, after the first mention and in `aliases`) | Wikidata [Q56298294](https://www.wikidata.org/wiki/Q56298294) `es` label; [OpenStax *Física universitaria* vol. 1, 16.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/16-3-rapidez-de-onda-en-una-cuerda-estirada) |
| high E string, low E string (of a guitar) | cuerda mi aguda, cuerda mi grave (*la mi aguda*, *la mi grave* after the first mention) | [OpenStax *Física universitaria* vol. 1, 16.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/16-3-rapidez-de-onda-en-una-cuerda-estirada) |
| lensmaker's equation | ecuación del fabricante de lentes | [OpenStax *Física universitaria* vol. 3, 2.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/2-4-lentes-delgadas) |
| Malus's law, polarizing filter | ley de Malus, filtro polarizador | [OpenStax *Física universitaria* vol. 3, 1.7](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/1-7-polarizacion); Wikidata [Q2120971](https://www.wikidata.org/wiki/Q2120971) `es` label |
| single-slit diffraction, slit width | difracción de una rendija, ancho de la rendija | [OpenStax *Física universitaria* vol. 3, 4.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/4-1-difraccion-de-una-rendija) |

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
| sensible heat | calor sensible | Wikidata [Q1480581](https://www.wikidata.org/wiki/Q1480581) `es` label |
| latent heat, heat of fusion, heat of vaporization | calor latente, calor de fusión, calor de vaporización | Wikidata [Q207721](https://www.wikidata.org/wiki/Q207721) `es` label; [OpenStax *Física universitaria* vol. 2, 1.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/1-5-cambios-de-fase) |
| temperature change (a term `\Delta T`) | variación de temperatura (*cambio de temperatura*, the OpenStax form, is equally correct in prose); *variación* for a change of a quantity follows *variación de energía de Gibbs* | [OpenStax *Física universitaria* vol. 2, 1.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/1-3-dilatacion-termica) (*cambio de temperatura*); [OpenStax *Química 2ed*, 16.4](https://openstax.org/books/qu%C3%ADmica-2ed/pages/16-4-energia-libre) (*variación*) |
| volumetric expansion coefficient | coeficiente de dilatación volumétrica; *dilatación volumétrica* names the effect (*expansión volumétrica* in `aliases`); *vías férreas*, not *raíles*, in prose | [OpenStax *Física universitaria* vol. 2, 1.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/1-3-dilatacion-termica) (*coeficiente de expansión (dilatación) volumétrica*, *vías férreas*) |
| thermal equilibrium | equilibrio térmico | [OpenStax *Física universitaria* vol. 2, 1.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/1-1-temperatura-y-equilibrio-termico) |
| Fourier's law (of heat conduction), heat flow rate, thickness | ley de Fourier (de la conducción del calor), flujo de calor (*tasa de transferencia de calor* in OpenStax), espesor | Universidad de Guanajuato, [REA, Clase digital 3](https://blogs.ugto.mx/rea/clase-digital-3-conduccion-unidimensional-en-estado-permanente/) (*ley de Fourier*, *flujo de calor*); [OpenStax *Física universitaria* vol. 2, 1.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/1-6-mecanismos-de-transferencia-de-calor) (*espesor*, *conducción*) |
| isobaric process, quasi-static process | proceso isobárico, proceso cuasiestático | [OpenStax *Física universitaria* vol. 2, 3.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/3-4-procesos-termodinamicos), [3.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/3-2-trabajo-calor-y-energia-interna) |
| thermal efficiency | rendimiento térmico (*eficiencia térmica* in `aliases`) | Wikidata [Q1452104](https://www.wikidata.org/wiki/Q1452104) `es` label (alias *eficiencia*) |
| hot reservoir, cold reservoir | reservorio caliente, reservorio frío (*foco caliente*, *foco frío*, common in Spain, in `aliases` only); refrigerator is *refrigerador* | [OpenStax *Física universitaria* vol. 2, 4.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/4-2-maquinas-termicas) (*reservorio*, *refrigeradores*); Universitat de València, [Física demos 081](https://www.uv.es/fisicademos/demos/demo081.pdf) (*foco caliente*, *foco frío*) |
| Stefan-Boltzmann law, emissivity, black body, grey body | ley de Stefan-Boltzmann (*ley de Stefan* in `aliases`), emisividad, cuerpo negro, cuerpo gris (usage) | [OpenStax *Física universitaria* vol. 2, 1.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/1-6-mecanismos-de-transferencia-de-calor); [vol. 3, 6.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/6-1-radiacion-de-cuerpo-negro); Wikidata [Q704747](https://www.wikidata.org/wiki/Q704747) `es` label |
| Wien's displacement law | ley de desplazamiento de Wien (*ley de Wien* in `aliases`) | [OpenStax *Física universitaria* vol. 3, 6.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/6-1-radiacion-de-cuerpo-negro); Wikidata [Q214336](https://www.wikidata.org/wiki/Q214336) `es` label and alias |
| rms speed | rapidez cuadrática media, *rapidez rms* (per the speed row, because the English name says *speed*); *velocidad rms* and *velocidad media cuadrática*, the OpenStax forms, named at most once in prose and kept in `aliases` | [OpenStax *Física universitaria* vol. 2, 2.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/2-2-presion-temperatura-y-velocidad-media-cuadratica-rms) |
| mean translational kinetic energy (of a molecule) | energía cinética media de traslación (*energía cinética promedio*, the OpenStax form, in `aliases`) | [OpenStax *Física universitaria* vol. 2, 2.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/2-2-presion-temperatura-y-velocidad-media-cuadratica-rms) |
| coefficient of performance, heat removed from the cold reservoir | coeficiente de rendimiento (COP; *coeficiente de operatividad*, the Wikidata [Q902090](https://www.wikidata.org/wiki/Q902090) `es` label, in `aliases`), calor extraído del reservorio frío | [OpenStax *Física universitaria* vol. 2, 4.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/4-3-refrigeradores-y-bombas-de-calor) |
| adiabatic process, isothermal process | proceso adiabático, proceso isotérmico | [OpenStax *Física universitaria* vol. 2, 3.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/3-6-procesos-adiabaticos-para-un-gas-ideal); [3.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/3-4-procesos-termodinamicos) |
| entropy change | variación de entropía (*cambio de entropía*, the OpenStax form, equally correct in prose), per the temperature-change row | [OpenStax *Física universitaria* vol. 2, 4.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/4-6-entropia) |
| microstate, macrostate, Boltzmann's entropy formula | microestado, macroestado (usage), fórmula de la entropía de Boltzmann (*fórmula de entropía de Boltzmann*, the Wikidata `es` label, in `aliases`) | [OpenStax *Química 2ed*, 16.2](https://openstax.org/books/qu%C3%ADmica-2ed/pages/16-2-entropia); Wikidata [Q375553](https://www.wikidata.org/wiki/Q375553) |
| Newton's law of cooling, ambient temperature, cooling constant | ley de enfriamiento de Newton (*enfriamiento newtoniano*, the Wikidata `es` label, in `aliases`), temperatura ambiente, constante de enfriamiento (usage) | [OpenStax *Cálculo* vol. 1, 6.8](https://openstax.org/books/c%C3%A1lculo-volumen-1/pages/6-8-crecimiento-y-decaimiento-exponencial); Wikidata [Q2902868](https://www.wikidata.org/wiki/Q2902868) |

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
| potential difference (prose) | after *diferencia de potencial* or *tensión eléctrica* has appeared, bare *tensión* is the accepted short form (the sense of mechanical *tensión* is excluded by context) | `magnitudes/electric-potential-difference` sidecar |
| electric current (prose) | *corriente* or *corriente eléctrica*; *intensidad de corriente* is correct but not needed | [OpenStax *Física universitaria* vol. 2, 9.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/9-1-corriente-electrica) (uses *corriente*, never *intensidad de corriente*) |
| conventional current | corriente convencional | [OpenStax *Física universitaria* vol. 2, 9.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/9-1-corriente-electrica) |
| test charge, source charge | carga de prueba, carga fuente | [OpenStax *Física universitaria* vol. 2, 5.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/5-4-campo-electrico) |
| point charge | carga puntual (OpenStax writes *carga de puntos*, avoided) | Wikidata [Q439029](https://www.wikidata.org/wiki/Q439029) `es` label |
| electric potential energy | energía potencial eléctrica (*energía potencial electrostática*, the Wikidata `es` label, in `aliases`) | [OpenStax *Física universitaria* vol. 2, 7.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/7-1-energia-potencial-electrica); Wikidata [Q841798](https://www.wikidata.org/wiki/Q841798) (alias *energía potencial eléctrica*) |
| capacitors in series, in parallel; equivalent capacitance | condensadores en serie, en paralelo; capacidad equivalente (*capacitancia equivalente*, the OpenStax form, in `aliases`, per the capacitance row) | [OpenStax *Física universitaria* vol. 2, 8.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/8-2-condensadores-en-serie-y-en-paralelo) |
| dielectric breakdown | ruptura dieléctrica | [OpenStax *Física universitaria* vol. 2, 8.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/8-5-modelo-molecular-de-un-dielectrico) |
| Leyden jar | botella de Leyden | Wikidata [Q23645](https://www.wikidata.org/wiki/Q23645) `es` label |
| battery capacity (ampere hours) | carga nominal or capacidad de carga, never bare *capacidad*, which names capacitance | usage (collision with the capacitance row) |
| resistor (component) | resistor (resistores); *resistencia* is the quantity, and *resistencias en serie/en paralelo* go in `aliases` | [OpenStax *Física universitaria* vol. 2, 10.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/10-2-resistores-en-serie-y-en-paralelo) |
| resistors in series, in parallel; equivalent resistance; reciprocal of a resistance | resistores en serie, en paralelo; resistencia equivalente; *inversa de la resistencia* (never *resistencia inversa*, which reads as the reverse resistance of a diode) | [OpenStax *Física universitaria* vol. 2, 10.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/10-2-resistores-en-serie-y-en-paralelo) |
| junction, junction rule, loop rule | nodo, regla de los nodos de Kirchhoff, regla de las tensiones de Kirchhoff (*regla de las mallas* only once a readable source confirms it) | [OpenStax *Física universitaria* vol. 2, 10.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/10-2-resistores-en-serie-y-en-paralelo) (*una unión, o nodo*, *regla de nodos*); [10.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/10-3-reglas-de-kirchhoff) (*regla de las tensiones*) |
| IR drop | caída de IR | [OpenStax *Física universitaria* vol. 2, 10.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/10-2-resistores-en-serie-y-en-paralelo) |
| internal resistance, terminal voltage, load resistance | resistencia interna, tensión en los terminales (*voltaje de los terminales*, the OpenStax form, and *tensión en bornes* in `aliases`), resistencia de carga; prose says *terminales*, never *bornes* | [OpenStax *Física universitaria* vol. 2, 10.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/10-1-fuerza-electromotriz) |
| temperature coefficient of resistance, thermistor | coeficiente de temperatura de la resistencia, termistor | [OpenStax *Física universitaria* vol. 2, 9.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/9-3-resistividad-y-resistencia) (*Coeficiente de temperatura, α*, *termistor*) |
| tungsten | tungsteno (the usual name in Latin America; *wolframio* in `aliases` where an entity is about the element) | [OpenStax *Física universitaria* vol. 2, 9.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/9-3-resistividad-y-resistencia) (*filamento de tungsteno*) |
| ohm metre | ohmio metro, the name of `units/ohm-metre` (OpenStax writes *ohmímetro*, avoided because it also names the meter); singular in prose per the product-name rule | sidecar |
| voltage divider | divisor de tensión (*divisor de voltaje* in `aliases`) | Wikidata [Q466758](https://www.wikidata.org/wiki/Q466758) `es` label |
| power dissipated, rated power, winch | potencia disipada, potencia nominal, cabrestante | [OpenStax *Física universitaria* vol. 2, 9.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/9-5-energia-electrica-y-potencia) |
| Joule heating, Joule's first law | efecto Joule, primera ley de Joule (*ley de Joule*, the Wikidata Q210009 `es` label, in `aliases`) | Wikidata [Q21014200](https://www.wikidata.org/wiki/Q21014200) `es` label (*efecto Joule*); usage (*primera ley de Joule*) |
| skin effect | efecto pelicular | Wikidata [Q664150](https://www.wikidata.org/wiki/Q664150) `es` label |
| turn (of a coil), turns per unit length | vuelta (*espira* is the synonym, named once in prose: *vueltas, o espiras*), número de vueltas por unidad de longitud | [OpenStax *Física universitaria* vol. 2, 12.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/12-6-solenoides-y-toroides) (*número de vueltas por unidad de longitud*); [15.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/15-6-transformadores) (*vueltas*) |
| wire (current-carrying), solenoid | hilo (*cable* and *alambre*, the OpenStax forms, in `aliases`), solenoide | `magnitudes/magnetic-flux-density` sidecar (*hilo que transporta corriente*); [OpenStax *Física universitaria* vol. 2, 12.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/12-6-solenoides-y-toroides) (*solenoide*) |
| primary/secondary coil (winding), step-up/step-down transformer | bobina primaria, bobina secundaria, per the inductor row (*bobinado*, the OpenStax form, and *devanado* are synonyms kept in `aliases`); transformador elevador, transformador reductor | [OpenStax *Física universitaria* vol. 2, 15.6](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/15-6-transformadores) (*dos bobinas separadas, o bobinados*; *transformador elevador*, *transformador reductor*) |
| peak value, peak voltage, peak current | valor de pico, tensión de pico, corriente de pico (*valor máximo* and *amplitud* as synonyms) | [OpenStax *Física universitaria* vol. 2, 15.1](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/15-1-fuentes-de-ac) (*valores máximos o pico*, *voltaje pico*) |
| motional emf, conducting rod | fem de movimiento (*emf de movimiento*, the OpenStax form, in `aliases`), varilla | [OpenStax *Física universitaria* vol. 2, 13.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/13-3-fuerza-electromotriz-emf-de-movimiento) (*emf de movimiento*, *varilla conductora*) |
| cyclotron radius (gyroradius) | radio de ciclotrón (*girorradio*, the Wikidata label, and *radio de Larmor* in `aliases`) | usage; Wikidata [Q1194458](https://www.wikidata.org/wiki/Q1194458) `es` label *girorradio*, alias *radio de Larmor* |
| magnetic force, right-hand rule, cyclotron, mass spectrometer | fuerza magnética, regla de la mano derecha (never numbered in prose), ciclotrón, espectrómetro de masas | [OpenStax *Física universitaria* vol. 2, 11, Términos clave](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-2/pages/11-terminos-clave) |
| Lenz's law | ley de Lenz | usage |

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
| nuclide, radionuclide | nucleido, radionucleido (never *núclido*, *radionúclido*) | [RAE, DLE, *nucleido* and *radionucleido*](http://web.archive.org/web/20211128232739/https://dle.rae.es/radionucleido); [CEM, *El Sistema Internacional de Unidades*, 9th ed., Table 4](https://www.cem.es/sites/default/files/documentos/2022-08/30362_elsistemainternacionaldeunidades_web_0.pdf) (*actividad referida a un radionucleido*) |
| radioactive decay law | ley de la desintegración radiactiva (*decaimiento* only in `aliases`, per the conventions above) | usage |
| half-life versus mean lifetime | *vida media* is the DLE synonym of *semivida* (an accepted alias), but physics texts also use it for the mean lifetime, so prose names the mean lifetime *tiempo de vida medio* | [RAE, DLE, *semivida*](http://web.archive.org/web/20210226045658/https://dle.rae.es/semivida) and [*vida media*](http://web.archive.org/web/2021/https://dle.rae.es/vida) |
| daughter nucleus, decay products | núcleo hijo, productos hijos, productos de desintegración | usage |
| radiocarbon dating, radiocarbon age | datación por radiocarbono, edad radiocarbónica (*datación por carbono-14*, *edad por carbono-14* in `aliases`; the isotope keeps the hyphen, *carbono-14*) | [UNLP, LATYR, 40 años del Laboratorio de Radiocarbono](https://sedici.unlp.edu.ar/bitstream/handle/10915/64283/Documento_completo.pdf?sequence=1) (*edades radiocarbónicas*, *datación radiocarbónica*) |
| absorbed dose, equivalent dose | dosis absorbida, dosis equivalente | CEM |
| photoelectron, photocurrent, maximum kinetic energy | fotoelectrón, fotocorriente, energía cinética máxima | [OpenStax *Física universitaria* vol. 3, 6.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/6-2-efecto-fotoelectrico) |
| cut-off frequency, cut-off wavelength | frecuencia de corte (synonym of *frecuencia umbral*), longitud de onda de corte | [OpenStax *Física universitaria* vol. 3, 6.2](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/6-2-efecto-fotoelectrico) |
| Planck–Einstein relation | relación de Planck-Einstein | Wikidata [Q12757333](https://www.wikidata.org/wiki/Q12757333) `es` label |
| Einstein's photoelectric equation | ecuación fotoeléctrica de Einstein | usage |
| photon momentum | cantidad de movimiento del fotón, per the momentum row (*momento lineal del fotón* in `aliases`) | usage |
| de Broglie wavelength, de Broglie equation | longitud de onda de De Broglie, ecuación de De Broglie | Wikidata [Q100981463](https://www.wikidata.org/wiki/Q100981463) `es` alias, [Q18653343](https://www.wikidata.org/wiki/Q18653343) `es` label |
| proper time interval, proper length | intervalo de tiempo propio, longitud propia | [OpenStax *Física universitaria* vol. 3, 5.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/5-3-dilatacion-del-tiempo) (*intervalo de tiempo propio*); Wikidata [Q1056595](https://www.wikidata.org/wiki/Q1056595), [Q3153623](https://www.wikidata.org/wiki/Q3153623) `es` labels |
| muon | muón (muones) | [OpenStax *Física universitaria* vol. 3, 5.3](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/5-3-dilatacion-del-tiempo) (*un muón*, *muones*) |
| energy level, ground state, excited state, ionization energy | nivel de energía, estado fundamental, estado excitado, energía de ionización | [OpenStax *Física universitaria* vol. 3, 6.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/6-4-modelo-de-bohr-del-atomo-de-hidrogeno) |
| principal quantum number | número cuántico principal (OpenStax writes *número cuántico de energía*) | Wikidata [Q867448](https://www.wikidata.org/wiki/Q867448) `es` label |
| Rydberg formula, Rydberg constant | fórmula de Rydberg, constante de Rydberg | [OpenStax *Física universitaria* vol. 3, 6.4](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-3/pages/6-4-modelo-de-bohr-del-atomo-de-hidrogeno); Wikidata [Q661248](https://www.wikidata.org/wiki/Q661248), [Q658065](https://www.wikidata.org/wiki/Q658065) `es` labels |
| reduced mass | masa reducida | Wikidata [Q550046](https://www.wikidata.org/wiki/Q550046) `es` label |
| photon emission rate, photon flux, count rate | tasa de emisión de fotones, flujo fotónico (*flujo de fotones* in `aliases`), tasa de recuento; never *ritmo* for these rates | Wikidata [Q83699542](https://www.wikidata.org/wiki/Q83699542) `es` label (*flujo fotónico*) |

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
| mass fraction | fracción másica (*fracción de masa*, the Wikidata `es` label, in `aliases`; never *fracción en masa*) | [RAE, DLE, *másico*](http://web.archive.org/web/20250124172855/https://dle.rae.es/m%C3%A1sico) (relative to mass as a physical quantity); Wikidata [Q899138](https://www.wikidata.org/wiki/Q899138); shipped sidecars (`units/percent`, `magnitudes/mass-concentration`) |
| stock solution, volumetric flask, to make up to the mark | disolución madre (OpenStax writes *solución madre*; *disolución* per the solution row), matraz aforado, enrasar | [OpenStax *Química 2ed*, 3.3](https://openstax.org/books/qu%C3%ADmica-2ed/pages/3-3-molaridad) (*solución madre*); usage |
| solution, solute, solvent | disolución, soluto, disolvente | usage |
| solutions (branch) | Disoluciones y concentración | usage |
| dilution, percent yield | dilución, rendimiento porcentual | usage |
| actual yield, theoretical yield | rendimiento real, rendimiento teórico (the OpenStax *porcentaje de rendimiento* goes in `aliases`) | [OpenStax *Química 2ed*, 4.4](https://openstax.org/books/qu%C3%ADmica-2ed/pages/4-4-rendimiento-de-la-reaccion) |
| atom economy | economía atómica | [OpenStax *Química 2ed*, 4.4](https://openstax.org/books/qu%C3%ADmica-2ed/pages/4-4-rendimiento-de-la-reaccion); Wikidata [Q903758](https://www.wikidata.org/wiki/Q903758) `es` label |
| percent composition | composición porcentual (*composición centesimal* in `aliases`) | [OpenStax *Química 2ed*, 3.2](https://openstax.org/books/qu%C3%ADmica-2ed/pages/3-2-determinacion-de-formulas-empiricas-y-moleculares) |
| stoichiometric coefficient, stoichiometric factor | coeficiente estequiométrico, factor estequiométrico | Wikidata [Q118455387](https://www.wikidata.org/wiki/Q118455387) `es` label; [OpenStax *Química 2ed*, 4.3](https://openstax.org/books/qu%C3%ADmica-2ed/pages/4-3-estequiometria-de-la-reaccion) (*factor estequiométrico*) |
| number of entities, Avogadro number, formula unit | número de entidades, número de Avogadro, unidad fórmula (OpenStax writes *unidad de fórmula*) | Wikidata [Q614112](https://www.wikidata.org/wiki/Q614112) `es` label; [OpenStax *Química 2ed*, 3.1](https://openstax.org/books/qu%C3%ADmica-2ed/pages/3-1-la-formula-de-masa-y-el-concepto-de-mol) |
| mass number, atomic number, neutron number | número másico (*número de masa*, the OpenStax form, in `aliases`), número atómico, número de neutrones | Wikidata [Q101395](https://www.wikidata.org/wiki/Q101395) `es` label and alias; [OpenStax *Química 2ed*, 2.3](https://openstax.org/books/qu%C3%ADmica-2ed/pages/2-3-estructura-atomica-y-simbolismo) |
| average atomic mass, isotopic abundance | masa atómica media (*masa atómica promedio*, the OpenStax form, in `aliases`; *media* as in *potencia media*), abundancia (*abundancia isotópica*, *abundancia natural* in `aliases`) | [OpenStax *Química 2ed*, 2.3](https://openstax.org/books/qu%C3%ADmica-2ed/pages/2-3-estructura-atomica-y-simbolismo); `branches/atomic-structure` sidecar |
| limiting reagent | reactivo limitante | usage |
| partial pressure | presión parcial | usage |
| Boyle's law | ley de Boyle (*ley de Boyle-Mariotte*, *ley de Mariotte* in `aliases`) | [OpenStax *Química 2ed*, 9.2](https://openstax.org/books/qu%C3%ADmica-2ed/pages/9-2-relaciones-entre-presion-volumen-cantidad-y-temperatura-la-ley-de-los-gases-ideales); Wikidata [Q175974](https://www.wikidata.org/wiki/Q175974) `es` label and aliases |
| Charles's law, Avogadro's law | ley de Charles, ley de Avogadro | [OpenStax *Química 2ed*, 9.2](https://openstax.org/books/qu%C3%ADmica-2ed/pages/9-2-relaciones-entre-presion-volumen-cantidad-y-temperatura-la-ley-de-los-gases-ideales) |
| Gay-Lussac's law (Amontons's law) | ley de Gay-Lussac (*ley de Amontons*, *segunda ley de Gay-Lussac* in `aliases`) | [OpenStax *Química 2ed*, 9.2](https://openstax.org/books/qu%C3%ADmica-2ed/pages/9-2-relaciones-entre-presion-volumen-cantidad-y-temperatura-la-ley-de-los-gases-ideales); Wikidata [Q202151](https://www.wikidata.org/wiki/Q202151) |
| combined gas law | ley general de los gases (*ley de los gases combinados*, the OpenStax form, and *ley combinada de los gases* in `aliases`) | Wikidata [Q1077153](https://www.wikidata.org/wiki/Q1077153) `es` label; [OpenStax *Química 2ed*, 9.2](https://openstax.org/books/qu%C3%ADmica-2ed/pages/9-2-relaciones-entre-presion-volumen-cantidad-y-temperatura-la-ley-de-los-gases-ideales), [*Química: comenzando con los átomos* 2ed, 8.2](https://openstax.org/books/qu%C3%ADmica-comenzando-%C3%A1tomos-2ed/pages/8-2-relaciones-entre-presion-volumen-cantidad-y-temperatura-la-ley-de-los-gases-ideales) |
| absolute zero, standard molar volume, standard temperature and pressure | cero absoluto, volumen molar estándar, temperatura y presión estándar | [OpenStax *Química 2ed*, 9.2](https://openstax.org/books/qu%C3%ADmica-2ed/pages/9-2-relaciones-entre-presion-volumen-cantidad-y-temperatura-la-ley-de-los-gases-ideales) |
| Dalton's law of partial pressures, total pressure | ley de las presiones parciales de Dalton (*ley de Dalton*, *ley de presiones parciales de Dalton* in `aliases`), presión total | [OpenStax *Química 2ed*, 9.3](https://openstax.org/books/qu%C3%ADmica-2ed/pages/9-3-estequiometria-de-sustancias-gaseosas-mezclas-y-reacciones); Wikidata [Q220089](https://www.wikidata.org/wiki/Q220089) `es` label *Ley de las presiones parciales* |
| Graham's law, effusion, diffusion, rate of effusion, to effuse | ley de Graham (*ley de Graham de efusión*), efusión, difusión, velocidad de efusión (a rate, like *velocidad de reacción*, not a speed), *se efusiona* (never *efunde*) | [OpenStax *Química 2ed*, 9.4](https://openstax.org/books/qu%C3%ADmica-2ed/pages/9-4-efusion-y-difusion-de-los-gases) |
| balanced equation | avoid the adjective (*ajustada* in Spain, *balanceada* in Latin America): *los coeficientes de la ecuación química* | usage |
| acid dissociation constant | constante de acidez | usage |
| ion product of water | producto iónico del agua | usage |
| titration | valoración (*titulación*, the OpenStax form, in `aliases`) | usage; [OpenStax *Química 2ed*, 4.5](https://openstax.org/books/qu%C3%ADmica-2ed/pages/4-5-analisis-quimico-cuantitativo) (*titulación*) |
| equivalence point, end point, burette, indicator, titrant | punto de equivalencia, punto final, bureta, indicador, titulante | [OpenStax *Química 2ed*, 4.5](https://openstax.org/books/qu%C3%ADmica-2ed/pages/4-5-analisis-quimico-cuantitativo) |
| standard solution (titrant of known concentration) | disolución patrón | usage |
| standard amount concentration | concentración molar estándar (*concentración estándar* after the first mention and in `aliases`) | Wikidata [Q88871689](https://www.wikidata.org/wiki/Q88871689) `es` label |
| hydrogen ion, hydronium ion, hydroxide ion | ion hidrógeno, ion hidronio, ion hidróxido (OpenStax writes *ion de hidronio*, *ion de hidróxido*) | [OpenStax *Química 2ed*, 14.1](https://openstax.org/books/qu%C3%ADmica-2ed/pages/14-1-acidos-y-bases-de-bronsted-lowry); [OpenStax *Química 2ed*, 14.2](https://openstax.org/books/qu%C3%ADmica-2ed/pages/14-2-ph-y-poh) |
| self-ionization of water, pOH, pKw | autoionización del agua (*constante de autoionización* for K_w, in `aliases`), pOH, pKw | Wikidata [Q1638091](https://www.wikidata.org/wiki/Q1638091) `es` label; [OpenStax *Química 2ed*, 14.2](https://openstax.org/books/qu%C3%ADmica-2ed/pages/14-2-ph-y-poh) |
| buffer solution | disolución amortiguadora | usage |
| enthalpy, Gibbs energy | entalpía, energía de Gibbs | usage |
| calorimetry, calorimeter, coffee-cup calorimeter, exothermic, endothermic | calorimetría, calorímetro, calorímetro de taza de café (*vaso de café* in `aliases`; OpenStax also says *vasos de poliestireno*), exotérmico, endotérmico | [OpenStax *Química 2ed*, 5.2](https://openstax.org/books/qu%C3%ADmica-2ed/pages/5-2-calorimetria) |
| Hess's law | ley de Hess (*law of constant heat summation* has no sourced Spanish calque; name it in English if needed) | Wikidata [Q220060](https://www.wikidata.org/wiki/Q220060) `es` label; [OpenStax *Química 2ed*, 5.3](https://openstax.org/books/qu%C3%ADmica-2ed/pages/5-3-entalpia) |
| standard enthalpy of reaction, standard enthalpy of formation, enthalpy change | entalpía estándar de reacción, entalpía estándar de formación, variación de entalpía (*cambio de entalpía*, the OpenStax form, equally correct in prose) | Wikidata [Q911664](https://www.wikidata.org/wiki/Q911664) `es` label; [OpenStax *Química 2ed*, 5.3](https://openstax.org/books/qu%C3%ADmica-2ed/pages/5-3-entalpia) |
| temperature at which the Gibbs energy change is zero | temperatura a la que la variación de energía de Gibbs se anula (never *temperatura de inversión*, which names the Joule-Thomson inversion temperature) | [OpenStax *Química 2ed*, 16.4](https://openstax.org/books/qu%C3%ADmica-2ed/pages/16-4-energia-libre) |
| molar gas constant | constante molar de los gases | usage |
| reaction rate, rate constant, rate law | velocidad de reacción, constante de velocidad, ley de velocidad | usage; [OpenStax *Química 2ed*, 12.1](https://openstax.org/books/qu%C3%ADmica-2ed/pages/12-1-tasas-de-reacciones-quimicas) (*velocidad de reacción*, also *tasa de reacción*) |
| chemical kinetics (branch) | Cinética química (*cinética de reacción* in `aliases`) | Wikidata [Q209082](https://www.wikidata.org/wiki/Q209082) `es` label and alias |
| average rate, instantaneous rate, initial rate | velocidad media, velocidad instantánea, velocidad inicial (OpenStax *tasa media*, *tasa instantánea*, *tasa inicial* in `aliases`) | usage, after the reaction rate row; [OpenStax *Química 2ed*, 12.1](https://openstax.org/books/qu%C3%ADmica-2ed/pages/12-1-tasas-de-reacciones-quimicas) |
| stoichiometric number (signed, negative for reactants) | número estequiométrico; the unsigned coefficient stays *coeficiente estequiométrico* | Wikidata [Q17326453](https://www.wikidata.org/wiki/Q17326453) `es` label |
| activation energy | energía de activación | usage |
| equilibrium constant, solubility product | constante de equilibrio, producto de solubilidad | usage |
| cell potential, standard electrode potential | potencial de la celda, potencial estándar de electrodo | usage |
| standard reduction potential | potencial estándar de reducción (*potencial de reducción estándar* is the OpenStax word order; *potencial normal de electrodo*, the Wikidata label of the standard electrode potential, goes only in `aliases`) | usage; [OpenStax *Química 2ed*, 17.3](https://openstax.org/books/qu%C3%ADmica-2ed/pages/17-3-potenciales-del-electrodo-y-de-la-celda); Wikidata [Q368639](https://www.wikidata.org/wiki/Q368639) |
| half-cell, cathode, anode, standard hydrogen electrode | semicelda, cátodo, ánodo, electrodo estándar de hidrógeno | [OpenStax *Química 2ed*, 17.3](https://openstax.org/books/qu%C3%ADmica-2ed/pages/17-3-potenciales-del-electrodo-y-de-la-celda) |
| Faraday's law of electrolysis, Faraday constant, electroplating, half-reaction | ley de Faraday de la electrólisis, constante de Faraday, galvanoplastia, semirreacción | Wikidata [Q220609](https://www.wikidata.org/wiki/Q220609) `es` label; [OpenStax *Química 2ed*, 17.7](https://openstax.org/books/qu%C3%ADmica-2ed/pages/17-7-electrolisis) |
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
| straight angle | ángulo llano | usage |
| length, width (of a rectangle or box) | largo, ancho (as term labels); *longitud del lado* for the side of a square | usage |
| edge (of a solid), apothem, slant height (of a cone) | arista, apotema, generatriz | usage |
| annulus | corona circular | usage |
| semi-major axis, semi-minor axis | semieje mayor, semieje menor | usage |
| rectangular prism (cuboid), space diagonal | prisma rectangular (*ortoedro* and *paralelepípedo rectangular* in `aliases`), diagonal espacial | usage |
| lateral area, surface area | área lateral, área total; the sphere follows its siblings (*Área total de la esfera*) | usage |
| opposite leg, adjacent leg | cateto opuesto, cateto contiguo (*cateto adyacente* in `aliases`) | usage |
| standard error of the mean | error estándar de la media (*error típico de la media* in `aliases`) | [OpenStax *Introducción a la estadística*, 8 Introducción](https://openstax.org/books/introducci%C3%B3n-estad%C3%ADstica/pages/8-introduccion); Wikidata [Q620994](https://www.wikidata.org/wiki/Q620994) `es` label *error estándar* |
| margin of error, confidence interval, confidence level, critical value, sample size | margen de error, intervalo de confianza, nivel de confianza, valor crítico, tamaño de la muestra | [OpenStax *Introducción a la estadística*, 8 Introducción](https://openstax.org/books/introducci%C3%B3n-estad%C3%ADstica/pages/8-introduccion); Wikidata [Q1352827](https://www.wikidata.org/wiki/Q1352827); *valor crítico*: usage |
| coefficient of variation | coeficiente de variación (*coeficiente de variabilidad*, the Wikidata `es` alias, and *desviación típica relativa* in `aliases`) | Wikidata [Q623738](https://www.wikidata.org/wiki/Q623738) |
| exponential distribution, cumulative distribution function, rate parameter, memoryless property | distribución exponencial, función de distribución acumulada (*acumulativa*, the OpenStax form, in `aliases`), parámetro de tasa (the OpenStax *parámetro de decaimiento* is named once in the exponential entry; the *decaimiento* row of the no-calques table covers radioactivity), propiedad de falta de memoria | [OpenStax *Introducción a la estadística*, 5.3](https://openstax.org/books/introducci%C3%B3n-estad%C3%ADstica/pages/5-3-la-distribucion-exponencial); Wikidata [Q237193](https://www.wikidata.org/wiki/Q237193); Wikidata [Q386228](https://www.wikidata.org/wiki/Q386228) `es` alias *función de distribución acumulada* |
| Cramer's rule, determinant, constant term (of a linear equation) | regla de Cramer (*método de Cramer* in `aliases`), determinante, término independiente | Wikidata [Q322666](https://www.wikidata.org/wiki/Q322666) `es` label and alias |
| circumradius, circumscribed circle, circumcentre | circunradio, circunferencia circunscrita (term label *Radio de la circunferencia circunscrita*), circuncentro | Wikidata [Q3678113](https://www.wikidata.org/wiki/Q3678113) `es` label |
| extended law of sines | teorema del seno generalizado, per the law of sines row (*teorema de los senos generalizado*, *teorema del seno extendido*, *ley de senos extendida* in `aliases`) | usage: Spanish Wikipedia names the 2R form *teorema de los senos generalizado*; no source found for *extendido* |
| nominal annual rate | tasa nominal anual | sidecar (`equations/compound-interest`) |
