import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { charsetOf, decodeBody, decodeCharacterReferences, htmlToText } from './html-text.mjs';

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Law of cosines | Example Textbook</title>
  <meta charset="utf-8">
  <style>body { font: 12px serif } .nav > a { color: red }</style>
  <script>window.track = function (a, b) { return a < b && b > 0; };</script>
</head>
<body>
  <header><a href="/">Example Textbook</a> <span>Log in</span></header>
  <nav aria-label="Chapters"><ul><li><a href="/1">Chapter 1</a></li><li>Chapter 2</li></ul></nav>
  <div role="navigation" class="breadcrumbs"><div><a href="/">Home</a></div> &gt; <div>Trigonometry</div></div>
  <main>
    <article>
      <header><h1>The law of cosines</h1></header>
      <p>The side facing an angle, squared, equals the sum of the squares of the other two sides.</p>
      <!-- a comment with <p>markup</p> that is never text -->
      <p data-note="a > b">It extends the Pythagorean theorem to every triangle.</p>
      <aside><p>Did you know? Sidebar trivia.</p></aside>
      <footer>Section 10.2</footer>
    </article>
  </main>
  <footer><p>Licensed under CC BY 4.0. Contact us.</p></footer>
  <script type="application/json">{"text": "</p>not prose<p>"}</script>
</body>
</html>`;

describe('htmlToText', () => {
	it('keeps the prose and drops head, scripts, styles, comments and page chrome', () => {
		assert.equal(
			htmlToText(PAGE),
			'The law of cosines The side facing an angle, squared, equals the sum of the squares of the other two sides. It extends the Pythagorean theorem to every triangle. Section 10.2',
		);
	});

	it('keeps a header or footer that belongs to an article, main or section', () => {
		const text = htmlToText(
			'<header>Site banner</header><section><header>Lead paragraph</header><p>Body</p><footer>Closing note</footer></section><footer>Site footer</footer>',
		);
		assert.equal(text, 'Lead paragraph Body Closing note');
	});

	it('drops an element carrying a chrome landmark role, nested same-name elements included', () => {
		assert.equal(
			htmlToText(
				'<div role="contentinfo"><div><div>Footer links</div></div> More footer</div><div>Kept prose</div>',
			),
			'Kept prose',
		);
		assert.equal(htmlToText('<div data-role="navigation">Kept prose</div>'), 'Kept prose');
	});

	it('joins words across inline tags and separates them across block tags', () => {
		assert.equal(
			htmlToText('<p>co<b>sine</b> <a href="#">rule</a>s</p><p>next</p>'),
			'cosine rules next',
		);
		assert.equal(
			htmlToText('<td>first</td><td>second</td>line<br>break'),
			'first second line break',
		);
	});

	it('drops MathML and SVG, mirroring the TeX stripped from descriptions', () => {
		assert.equal(
			htmlToText(
				'<p>where <math><mi>a</mi><mo>=</mo><mn>2</mn></math> is a side <svg viewBox="0 0 1 1"><text>label</text></svg>length</p>',
			),
			'where is a side length',
		);
	});

	it('drops MathJax TeX spans, but not prose after a stray delimiter', () => {
		assert.equal(
			htmlToText('<p>the speed \\(c\\) of light \\[E = mc^2\\] here</p>'),
			'the speed of light here',
		);
		const stray = `<p>a stray \\( then ${'prose '.repeat(200)}and \\) late</p>`;
		assert.ok(htmlToText(stray).includes('prose prose'));
	});

	it('keeps the rest of the page when a dropped element never closes', () => {
		assert.equal(
			htmlToText('<nav>Menu <p>Prose after an unclosed nav</p>'),
			'Menu Prose after an unclosed nav',
		);
	});

	it('reads an unclosed raw-text element to the end of the document, as a browser does', () => {
		assert.equal(htmlToText('<p>Prose</p><script>var s = "<p>never prose</p>";'), 'Prose');
	});

	it('ignores self-closing chrome tags and markup inside attribute values', () => {
		assert.equal(htmlToText('<nav/><p title="<nav>">Prose</p><svg/>stays'), 'Prose stays');
	});

	it('decodes character references after removing tags, so escaped markup stays text', () => {
		assert.equal(
			htmlToText('<p>&lt;p&gt; is a tag &amp; caf&eacute; is a word</p>'),
			'<p> is a tag & café is a word',
		);
	});

	it('removes soft hyphens and zero-width characters inside words and collapses whitespace', () => {
		assert.equal(
			htmlToText('<p>co&shy;sine\u{200B}\n\t rule&nbsp;&thinsp;here\u{AD}s</p>'),
			'cosine rule heres',
		);
	});
});

describe('decodeCharacterReferences', () => {
	it('maps the HTML 4 Latin-1 and Greek names to their code points', () => {
		assert.equal(
			decodeCharacterReferences('&nbsp;&iquest;&Agrave;&times;&szlig;&yuml;'),
			'\u{A0}\u{BF}\u{C0}\u{D7}\u{DF}\u{FF}',
		);
		assert.equal(
			decodeCharacterReferences('&Alpha;&Rho;&Sigma;&Omega;'),
			'\u{391}\u{3A1}\u{3A3}\u{3A9}',
		);
		assert.equal(
			decodeCharacterReferences('&alpha;&rho;&sigmaf;&sigma;&omega;&thetasym;'),
			'\u{3B1}\u{3C1}\u{3C2}\u{3C3}\u{3C9}\u{3D1}',
		);
		assert.equal(decodeCharacterReferences('&Sigmaf;'), ' ');
	});

	it('decodes numeric references with the HTML parser repairs', () => {
		assert.equal(decodeCharacterReferences('&#233;&#xE9;&#X3C0;'), 'ééπ');
		assert.equal(decodeCharacterReferences('&#150;&#156;'), '–œ');
		assert.equal(decodeCharacterReferences('&#0;&#xD800;&#x110000;'), '\u{FFFD}'.repeat(3));
	});

	it('turns an unknown name into a word break and leaves a bare ampersand alone', () => {
		assert.equal(decodeCharacterReferences('a&rarr;b &unknownentity; AT&T'), 'a b   AT&T');
	});
});

describe('charsetOf and decodeBody', () => {
	const latin1 = Uint8Array.from([0x63, 0x61, 0x66, 0xe9]);

	it('prefers a byte order mark, then the Content-Type charset, then a meta declaration', () => {
		assert.equal(
			charsetOf('text/html; charset=ISO-8859-1', Uint8Array.from([0xef, 0xbb, 0xbf])),
			'utf-8',
		);
		assert.equal(charsetOf('text/html; charset="ISO-8859-1"', latin1), 'iso-8859-1');
		const meta = new TextEncoder().encode(
			'<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1252">',
		);
		assert.equal(charsetOf('text/html', meta), 'windows-1252');
		assert.equal(charsetOf(null, new TextEncoder().encode('<meta charset=utf-8>')), 'utf-8');
		assert.equal(charsetOf('text/html', latin1), 'utf-8');
	});

	it('decodes a Latin-1 page so accented words survive', () => {
		assert.equal(decodeBody(latin1, 'text/html; charset=iso-8859-1'), 'café');
	});

	it('falls back to UTF-8 for an encoding label it does not know', () => {
		assert.equal(
			decodeBody(new TextEncoder().encode('café'), 'text/html; charset=x-unknown'),
			'café',
		);
	});
});
