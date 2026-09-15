// Tone and vocabulary rules from the HarbourCloud messaging brief.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', 'node_modules', 'tests', '.browser-check', '.playwright-mcp']);

function htmlFiles(dir = ROOT) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP.has(e.name)) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : e.name.endsWith('.html') ? [relative(ROOT, p)] : [];
  });
}

function readableText(html) {
  const attrs = [...html.matchAll(/\s(?:content|alt|title|aria-label|placeholder)="([^"]*)"/gi)].map((m) => m[1]);
  const body = html
    .replace(/<script(?! type="application\/ld\+json")[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
  return [body, ...attrs].join(' ').replace(/\s+/g, ' ');
}

const context = (text, index) => text.slice(Math.max(0, index - 50), index + 50);

const RULES = [
  [/—|\s–\s/, 'em dash (or spaced en dash used as a dash)'],
  [/\b(cheapest|cheap|discount(s|ed)?|reseller|resell(ing)?|bulk licen[cs]es?|price[- ]match(ing)?)\b/i, 'wrong-reader word'],
  [/\b(best deals?|great deals?|a deal on|deals)\b/i, '"deal" as in bargain'],
  [/\b(digital transformation|synerg(y|ies)|best[- ]in[- ]class|world[- ]class|cutting[- ]edge|seamless(ly)?)\b/i, 'buzzword'],
];

describe('messaging brief: homepage structure', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const text = readableText(html);
  const h1 = readableText(html.match(/<h1[\s\S]*?<\/h1>/i)?.[0] ?? '');

  test('h1 carries the core positioning', () => {
    assert.match(h1, /Microsoft 365/);
    assert.match(h1, /Azure/);
    assert.match(h1, /senior engineer/i);
    assert.match(h1, /Microsoft's own price|same price/i);
  });

  test('the four value pillars appear in order', () => {
    const pillars = [
      'Correct from day one',
      'Security you already paid for, switched on',
      'One senior person, not a ticket queue',
      'Azure and AI, built and run for you',
    ];
    let last = -1;
    for (const p of pillars) {
      const i = text.indexOf(p);
      assert.ok(i > last, `pillar "${p}" missing or out of order`);
      last = i;
    }
  });

  test('security pillar speaks to compliance-minded readers', () => {
    for (const w of [/Defender/, /Intune/, /Entra/, /Purview/, /MFA/, /conditional access/i, /device compliance/i, /audit-ready/i]) assert.match(text, w);
  });

  test('explains buying through a CSP partner costs the same as direct', () => {
    assert.match(html, /\sid="why-csp"/);
    assert.match(text, /Cloud Solution Provider/);
    assert.match(text, /same (price|cost) as buying (from Microsoft )?direct/i);
  });

  test('names the audience: 20 to 300 staff, financial services', () => {
    assert.match(text, /20 to 300 staff/);
    assert.match(text, /financial services/i);
  });
});

describe('messaging brief: tone and vocabulary', () => {
  for (const page of htmlFiles()) {
    test(page, () => {
      const text = readableText(readFileSync(join(ROOT, page), 'utf8'));
      for (const [re, label] of RULES) {
        const hit = text.match(re);
        assert.equal(hit, null, `${page}: ${label}: "${hit && context(text, hit.index)}"`);
      }
    });
  }

  test('"free" only ever appears as "free Microsoft 365 security check"', () => {
    for (const page of htmlFiles()) {
      const text = readableText(readFileSync(join(ROOT, page), 'utf8'));
      for (const m of text.matchAll(/\bfree\b/gi)) {
        assert.match(text.slice(m.index, m.index + 40), /^free Microsoft 365 security check/i, `${page}: "${context(text, m.index)}"`);
      }
    }
  });
});
