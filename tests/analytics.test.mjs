// Google Analytics 4 contract. Passes while no tag is installed, and enforces a correct,
// consistent install the moment a Measurement ID appears on any page.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const PAGES = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const MEASUREMENT_ID = /G-[A-Z0-9]{8,}/g;

const tagged = PAGES.filter((p) => MEASUREMENT_ID.test(read(p)));
const ids = [...new Set(PAGES.flatMap((p) => read(p).match(MEASUREMENT_ID) ?? []))];

describe('Google Analytics 4', () => {
  test('one Measurement ID across the whole site, or none at all', () => {
    assert.ok(ids.length <= 1, `conflicting Measurement IDs: ${ids.join(', ')}`);
    assert.doesNotMatch(ids[0] ?? '', /^G-X+$/i, 'placeholder Measurement ID left in the page');
  });

  test('when installed, the tag loads correctly on every page that carries it', (t) => {
    if (!ids.length) return t.skip('no analytics installed yet');
    for (const page of tagged) {
      const html = read(page);
      assert.match(html, /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]{8,}"><\/script>/, `${page}: gtag loader missing or not async`);
      assert.match(html, /gtag\('config', 'G-[A-Z0-9]{8,}'\)/, `${page}: gtag config call missing`);
      assert.equal((html.match(/googletagmanager\.com\/gtag\/js/g) ?? []).length, 1, `${page}: tag included more than once`);
    }
  });

  test('when installed, every indexable page is tracked', (t) => {
    if (!ids.length) return t.skip('no analytics installed yet');
    const indexable = PAGES.filter((p) => !/<meta name="robots" content="noindex/.test(read(p)));
    for (const page of indexable) assert.ok(tagged.includes(page), `${page}: indexable but untracked`);
  });

  test('when installed, the privacy policy discloses analytics and cookies', (t) => {
    if (!ids.length) return t.skip('no analytics installed yet');
    const privacy = read('privacy.html');
    assert.match(privacy, /analytics/i, 'privacy policy does not mention analytics');
    assert.match(privacy, /cookie/i, 'privacy policy does not mention cookies');
  });

  test('no competing trackers slip in alongside', () => {
    for (const page of PAGES) {
      const html = read(page);
      for (const re of [/hotjar/i, /clarity\.ms/i, /facebook\.net\/.*fbevents/i, /plausible\.io/i]) {
        assert.doesNotMatch(html, re, `${page}: unexpected third-party tracker ${re}`);
      }
    }
  });
});

describe('Search Console verification', () => {
  test('any verification meta tag or file stays consistent with the domain', () => {
    const meta = read('index.html').match(/<meta name="google-site-verification" content="([^"]+)"/)?.[1];
    if (meta) assert.ok(meta.length > 20, 'google-site-verification token looks wrong');
    const files = readdirSync(ROOT).filter((f) => /^google[0-9a-f]{16}\.html$/.test(f));
    assert.ok(files.length <= 1, `more than one verification file: ${files.join(', ')}`);
  });
});
