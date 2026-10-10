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
| cubic metre per second | metro cúbico por segundo (metros cúbicos por segundo) | Wikidata [Q794261](https://www.wikidata.org/wiki/Q794261) `es` label |
| litre per second, litre per minute | litro por segundo, litro por minuto (litros por segundo, litros por minuto; plural on the first noun, as *julios por kilogramo*) | Wikidata [Q61996348](https://www.wikidata.org/wiki/Q61996348), [Q107313814](https://www.wikidata.org/wiki/Q107313814) `es` labels; [OpenStax *Física universitaria* vol. 1, 14.5](https://openstax.org/books/f%C3%ADsica-universitaria-volumen-1/pages/14-5-dinamicas-de-fluidos) (*litros por minuto*) |
| week, month, year, decade, century | semana, mes, año, década, siglo | usage |
| dioptre | dioptría (dioptrías); EU-permitted, not SI-accepted | [Directive 80/181/EEC, Spanish consolidated text, Annex, Chapter I, 4](https://eur-lex.europa.eu/legal-content/ES/TXT/HTML/?uri=CELEX:01980L0181-20200613); Wikidata [Q193933](https://www.wikidata.org/wiki/Q193933) `es` label |
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
| straight angle | ángulo llano | usage |
| length, width (of a rectangle or box) | largo, ancho (as term labels); *longitud del lado* for the side of a square | usage |
| edge (of a solid), apothem, slant height (of a cone) | arista, apotema, generatriz | usage |
| annulus | corona circular | usage |
| semi-major axis, semi-minor axis | semieje mayor, semieje menor | usage |
| rectangular prism (cuboid), space diagonal | prisma rectangular (*ortoedro* and *paralelepípedo rectangular* in `aliases`), diagonal espacial | usage |
| lateral area, surface area | área lateral, área total; the sphere follows its siblings (*Área total de la esfera*) | usage |
| opposite leg, adjacent leg | cateto opuesto, cateto contiguo (*cateto adyacente* in `aliases`) | usage |
