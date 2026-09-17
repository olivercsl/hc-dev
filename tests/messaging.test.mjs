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
  [/\b(cheapest|cheap|discount(s|ed)?|bulk licen[cs]es?|price[- ]match(ing)?)\b/i, 'wrong-reader word'],
  [/\b(best deals?|great deals?|a deal on|deals)\b/i, '"deal" as in bargain'],
  [/\b(digital transformation|synerg(y|ies)|best[- ]in[- ]class|world[- ]class|cutting[- ]edge|seamless(ly)?)\b/i, 'buzzword'],
];

describe('messaging brief: homepage structure', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const text = readableText(html);
  const h1 = readableText(html.match(/<h1[\s\S]*?<\/h1>/i)?.[0] ?? '');

  test('h1 leads on building AI projects', () => {
    assert.match(h1, /AI projects/i);
    assert.match(h1, /(Azure|AWS)/);
    assert.match(h1, /(built and run|design)/i);
  });

  test('positions as a reseller plus MSP across Azure, Microsoft licensing and AWS', () => {
    assert.match(text, /reseller/i);
    assert.match(text, /Cloud Solution Provider/);
    assert.match(text, /\bAWS\b/);
    assert.match(text, /Azure/);
    assert.match(text, /licen[cs]ing/i);
  });

  test('a small, fast-moving team with an AI focus', () => {
    assert.match(text, /small( and senior| senior)? team|small team/i);
    assert.match(text, /fast|quick/i);
  });

  test('reinforces cost-effectiveness and efficiency without price talk', () => {
    assert.match(text, /cost[- ]effective|efficien/i);
  });

  test('hero opens the conversation from the customer\'s pain points', () => {
    const hero = html.match(/<section[^>]*\sid="home"[\s\S]*?<\/section>/i)?.[0] ?? '';
    const heroText = readableText(hero);
    assert.match(heroText, /pain points?|where it hurts|what slows|tell us|all ears|your problem/i);
    assert.doesNotMatch(heroText, /we find the use cases/i);
  });

  test('contact invites the problem, not a brief', () => {
    const contact = html.match(/<section[^>]*\sid="contact"[\s\S]*?<\/section>/i)?.[0] ?? '';
    assert.match(readableText(contact), /pain points?|all ears|what slows|where the work|problem/i);
  });

  test('sells a managed service, not a one-person show', () => {
    assert.match(text, /managed service/i);
    const oneMan = /\b(?:the|a|your|one) (?:senior )?(?:cloud )?engineer\b|\bone (?:senior )?person\b|\bthe person who\b|\bsenior engineer\b/i;
    const hit = text.match(oneMan);
    assert.equal(hit, null, `one-person framing: "${hit && context(text, hit.index)}"`);
  });

  test('the Microsoft foundation pillars survive, in order, below the AI story', () => {
    const lower = text.toLowerCase();
    const pillars = [
      'correct from day one',
      'security you already paid for, switched on',
      'accountable service, not a ticket queue',
    ];
    let last = lower.indexOf('azure ai');
    assert.ok(last > -1, 'AI story must come first');
    for (const p of pillars) {
      const i = lower.indexOf(p, last + 1);
      assert.ok(i > last, `pillar "${p}" missing or out of order`);
      last = i;
    }
  });

  test('security pillar speaks to compliance-minded readers', () => {
    for (const w of [/Defender/, /Intune/, /Entra/, /Purview/, /MFA/, /conditional access/i, /device compliance/i, /audit-ready/i]) assert.match(text, w);
  });

  test('explains what buying cloud through Harbour Cloud adds, without price talk', () => {
    assert.match(html, /\sid="why-csp"/);
    assert.match(text, /Cloud Solution Provider/);
    assert.doesNotMatch(text, /\bpricing\b/i);
  });

  test('speaks to the audience without publishing the staff-count range', () => {
    assert.match(text, /financial services/i);
    const range = text.match(/\b\d{1,4}\s*(?:to|-|–)\s*\d{1,4}\s*(?:staff|employees|seats|users|people)\b/i);
    assert.equal(range, null, `staff-count range is internal targeting, not site copy: "${range?.[0]}"`);
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
