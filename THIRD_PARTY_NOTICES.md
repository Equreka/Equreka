# Third-party notices

Equreka's code is licensed under GPL-3.0-or-later and its content under CC BY-SA 4.0 (README, *License*; ADR 0011). This file covers two kinds of third-party material:

- third-party text adapted in the content and in the UI catalogs;
- the third-party assets the web app redistributes under their own licenses.

## Content adapted from third-party text

The content in `packages/content/content/` is licensed under CC BY-SA 4.0 (`packages/content/content/LICENSE`). Some entries adapt text from works under compatible licenses, mostly Wikipedia articles under CC BY-SA 4.0.

The credits are kept per entry, not in this file:

- **Source of truth:** each entry's `textSources` field lists the title, URL and license of every work it adapts.
- **Web page:** the entry's page shows each credit as a "Text adapted from" line under the description.
- **Metadata:** the page's JSON-LD carries each credit as an `isBasedOn` work.

`docs/content/originality-baseline.md` records the check that found the current credits.

## Text in the UI catalogs

These strings in `packages/core/src/i18n/en.ts` and `es.ts` come from the legacy app. Their text is adapted from Wikipedia, CC BY-SA 4.0, measured against each article's revision of 2026-10-06. Wikipedia contributors hold the copyright. The strings are used in this GPL-3.0-or-later code under Creative Commons' declared one-way compatibility of CC BY-SA 4.0 with GPLv3 (ADR 0011).

| Key | Locale | Source |
| --- | --- | --- |
| `design.content.home.type.formulas` | en | [Wikipedia: Formula](https://en.wikipedia.org/wiki/Formula) |
| `design.content.home.type.constants` | en | [Wikipedia: Constant (mathematics)](https://en.wikipedia.org/wiki/Constant_(mathematics)) |
| `design.content.home.type.magnitudes` | es | [Wikipedia: Magnitud física](https://es.wikipedia.org/wiki/Magnitud_f%C3%ADsica) |
| `design.content.home.type.units` | en | [Wikipedia: Unit of measurement](https://en.wikipedia.org/wiki/Unit_of_measurement) |
| `design.content.home.type.units` | es | [Wikipedia: Unidad de medida](https://es.wikipedia.org/wiki/Unidad_de_medida) |
| `design.content.home.type.prefixes` | en | [Wikipedia: Unit prefix](https://en.wikipedia.org/wiki/Unit_prefix) |
| `design.content.home.category.mathematics` | en | [Wikipedia: Glossary of engineering: M–Z](https://en.wikipedia.org/wiki/Glossary_of_engineering:_M%E2%80%93Z) |
| `design.content.home.category.physics` | en | [Wikipedia: Physics](https://en.wikipedia.org/wiki/Physics) |
| `design.content.home.category.physics` | es | [Wikipedia: Física](https://es.wikipedia.org/wiki/F%C3%ADsica) |
| `design.content.home.category.chemistry` | en | [Wikipedia: Glossary of engineering: A–L](https://en.wikipedia.org/wiki/Glossary_of_engineering:_A%E2%80%93L) |

The other `design.content.home.*` strings read as encyclopedia prose too, but no longer match a current revision. The content rewrite wave replaces all of them with original text.

## Bootstrap Icons 1.9.1

- Source: https://github.com/twbs/icons
- Used for: SVG path data vendored into `apps/web/src/lib/icons.ts` (29 icons).
- License: MIT

```text
The MIT License (MIT)

Copyright (c) 2019-2021 The Bootstrap Authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Poppins (via @fontsource/poppins 5.3.0)

- Source: https://github.com/itfoundry/Poppins
- Used for: latin-subset woff2 files for weights 500 and 600, copied into the web build at `/fonts/` and precached by the service worker.
- Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins)
- License: SIL Open Font License, Version 1.1

```text
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```
