// Static checks that gate every deploy of harbourcloud.com.au.
// Run with `npm test`. Zero dependencies (node:test).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://harbourcloud.com.au/';
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const PAGES = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const INDEXABLE = PAGES.filter((f) => f !== 'thank-you.html');

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

// Everything a visitor or crawler can read: body text, meta content, alt text, JSON-LD.
function readableText(html) {
  const attrs = [...html.matchAll(/\s(?:content|alt|title|aria-label)="([^"]*)"/gi)].map((m) => m[1]);
  const jsonld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  return [visibleText(html), ...attrs, ...jsonld].join(' ');
}

const meta = (html, name) =>
  html.match(new RegExp(`<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`, 'i'))?.[1];

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].flatMap((m) => {
    const data = JSON.parse(m[1]);
    return data['@graph'] ?? [data];
  });
}

function sectionById(html, id) {
  return html.match(new RegExp(`<section[^>]*\\sid="${id}"[\\s\\S]*?</section>`, 'i'))?.[0];
}

describe('brief constraints: no pricing, discounts, suppliers or AI token reselling', () => {
  const FORBIDDEN = [
    [/[$€£]\s?\d/, 'currency amount'],
    [/[−–-]\s?\d+\s?%/, 'negative percentage'],
    [/\d+\s?%\s*(off|discount|saving|savings|cheaper|lower)/i, 'percentage saving'],
    [/\b(discounts?|wholesale|rebates?|margins?)\b/i, 'discount/wholesale wording'],
    [/\bpricing\b/i, '"pricing"'],
    [/\b(AI tokens?|per 1M tokens|\/1M tokens)\b/i, 'AI token reselling'],
    [/\b(Qwen|Anthropic|Claude|Gemini|DeepSeek)\b/i, 'AI model vendor / supplier'],
    [/\b(cheaper|cost reduction|cost savings?|savings|guaranteed|reduce (?:your )?(?:\w+ )?(?:costs?|spend(?:ing)?|expenditure))\b/i, 'cheaper-is-better pitch'],
    [/\b(Pax8|Ingram|Dicker Data|Rhipe|Crayon|Leader Systems|TD Synnex)\b/i, 'distributor'],
  ];
  for (const page of PAGES) {
    test(page, () => {
      const text = readableText(read(page));
      for (const [re, label] of FORBIDDEN) {
        const hit = text.match(re);
        assert.equal(hit, null, `${page}: ${label} found: "${hit && text.slice(Math.max(0, hit.index - 40), hit.index + 40)}"`);
      }
    });
  }
});

describe('Australian English', () => {
  // Vendor product names keep their own spelling (AWS Organizations is what AWS calls it).
  const PRODUCT_NAMES = /\bAWS Organizations?\b|\bOrganizations? unit\b/gi;
  const US = /\b(optimiz\w*|organiz\w*|analyz\w*|customiz\w*|prioritiz\w*|minimiz\w*|maximiz\w*|moderniz\w*|centraliz\w*|standardiz\w*|authoriz\w*|specializ\w*|utiliz\w*|centers?|colors?|behaviors?|favorites?|honors?|licenses)\b/i;
  const LICENCE_NOUN = /\blicense\s+(audit|savings?|management|renewals?|costs?|lifecycle|types?|count)\b/i;
  for (const page of PAGES) {
    test(page, () => {
      const text = readableText(read(page)).replace(PRODUCT_NAMES, ' ');
      for (const re of [US, LICENCE_NOUN]) {
        const hit = text.match(re);
        assert.equal(hit, null, `${page}: US spelling "${hit?.[0]}"`);
      }
    });
  }
});

describe('Azure and AI pillar', () => {
  const html = read('index.html');
  const ai = sectionById(html, 'azure-ai');

  test('exists and is linked from the navigation', () => {
    assert.ok(ai, 'section#azure-ai missing');
    assert.match(html.match(/<nav[\s\S]*?<\/nav>/i)[0], /href="#azure-ai"/);
  });

  test('Azure and AI workloads designed, built and run, with predictable cost', () => {
    const t = visibleText(ai);
    assert.match(t, /Azure OpenAI/);
    assert.match(t, /Foundry/);
    assert.match(t, /design/i);
    assert.match(t, /build/i);
    assert.match(t, /(operate|run)/i);
    assert.match(t, /(cost governance|predictable)/i);
  });

  test('no free-management claims anywhere on the page', () => {
    const text = visibleText(html);
    const claims = [
      /management is included/i,
      /no additional cost/i,
      /no extra (cost|fee|charge)/i,
      /included when you run Azure/i,
      /at no cost/i,
      /free of charge/i,
      /management (is )?free/i,
    ];
    for (const re of claims) {
      const hit = text.match(re);
      assert.equal(hit, null, `free-MSP claim on the page: "${hit && text.slice(Math.max(0, hit.index - 60), hit.index + 60)}"`);
    }
  });

  test('covers Microsoft Copilot readiness somewhere on the page', () => {
    assert.match(visibleText(html), /Copilot readiness/i);
  });

  test('AI agents and automation have their own section', () => {
    const agents = sectionById(html, 'ai-agents');
    assert.ok(agents, 'section#ai-agents missing');
    const t = visibleText(agents);
    assert.match(t, /agents?/i);
    assert.match(t, /(your own data|your data)/i);
  });

  test('private AI section offers on-premises inference on open-source models', () => {
    const priv = sectionById(html, 'private-ai');
    assert.ok(priv, 'section#private-ai missing');
    const t = visibleText(priv);
    assert.match(t, /(local|private|on-premises) inference/i);
    assert.match(t, /open-source models/i);
  });

  test('managed Microsoft 365 remains as a supporting section', () => {
    const managed = sectionById(html, 'managed');
    assert.ok(managed, 'section#managed missing');
    const t = visibleText(managed);
    assert.match(t, /Microsoft 365/);
    assert.match(t, /(licen[cs]ing|licences)/i);
    assert.match(t, /security/i);
  });
});

describe('business details', () => {
  test('homepage mentions Azure, AWS and Alibaba Cloud', () => {
    const t = visibleText(read('index.html'));
    for (const p of [/Azure/, /AWS/, /Alibaba Cloud/]) assert.match(t, p);
  });

  test('every page shows the real ABN and no placeholder ABN', () => {
    for (const page of PAGES) {
      const html = read(page);
      assert.match(html, /74 673 268 507/, `${page}: ABN missing`);
      assert.doesNotMatch(html, /12 345 678 901/, `${page}: placeholder ABN`);
    }
  });

  test('every page uses the owner email, with no leftover hello@ address', () => {
    for (const page of PAGES) {
      const html = read(page);
      assert.doesNotMatch(html, /hello@harbourcloud\.com\.au/, `${page}: old hello@ address`);
      assert.match(html, /oliver@harbourcloud\.com\.au/, `${page}: owner email missing`);
    }
  });

  test('registered address is Three International Towers, Barangaroo', () => {
    const html = read('index.html');
    assert.match(visibleText(html), /300 Barangaroo Avenue/);
    const biz = jsonLd(html).find((i) => i.address);
    assert.equal(biz?.address?.postalCode, '2000');
    assert.match(biz?.address?.streetAddress ?? '', /300 Barangaroo Avenue/);
  });
});

describe('calls to action (email only for now)', () => {
  const html = read('index.html');

  test('"Talk to an expert" in the nav and hero, pointing at contact', () => {
    assert.match(html.match(/<nav[\s\S]*?<\/nav>/i)[0], /<a[^>]+href="#contact"[^>]*>[^<]*Talk to an expert/i);
    assert.match(sectionById(html, 'home'), /<a[^>]+href="#contact"[^>]*>[^<]*Talk to an expert/i);
  });

  test('secondary CTA is "Request a security review"', () => {
    assert.match(visibleText(html), /Request a security review/i);
  });

  test('contact uses email with a prefilled enquiry template and no form', () => {
    const contact = sectionById(html, 'contact');
    assert.ok(contact, 'section#contact missing');
    assert.doesNotMatch(html, /<form[\s>]/i);
    const mailto = contact.match(/href="(mailto:oliver@harbourcloud\.com\.au\?[^"]+)"/)?.[1];
    assert.ok(mailto, 'no mailto with subject/body');
    const body = decodeURIComponent(mailto.replace(/&amp;/g, '&'));
    for (const field of [/Name/, /Company/, /Staff count/, /Current Microsoft setup/, /on your mind/]) assert.match(body, field);
  });
});

describe('technical SEO', () => {
  for (const page of INDEXABLE) {
    describe(page, () => {
      const html = read(page);
      test('lang is en-AU', () => assert.match(html, /<html lang="en-AU">/));
      test('exactly one h1', () => assert.equal((html.match(/<h1[\s>]/gi) ?? []).length, 1));
      test('title 30–65 chars', () => {
        const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
        assert.ok(title.length >= 30 && title.length <= 65, `title length ${title.length}: "${title}"`);
      });
      test('meta description 110–160 chars', () => {
        const d = meta(html, 'description') ?? '';
        assert.ok(d.length >= 110 && d.length <= 160, `description length ${d.length}`);
      });
      test('canonical points at production', () => {
        const href = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
        const expected = page === 'index.html' ? SITE : SITE + page;
        assert.equal(href, expected);
      });
      test('Open Graph title and description', () => {
        assert.ok(meta(html, 'og:title'));
        assert.ok(meta(html, 'og:description'));
      });
    });
  }

  test('index JSON-LD describes the business', () => {
    const items = jsonLd(read('index.html'));
    const biz = items.find((i) => [i['@type']].flat().some((t) => /ProfessionalService|LocalBusiness|Organization/.test(t)));
    assert.ok(biz, 'no business entity in JSON-LD');
    assert.equal(biz.name, 'Harbour Cloud');
    assert.equal(biz.url, SITE);
    assert.match(JSON.stringify(biz.areaServed), /Australia/);
  });

  test('thank-you page is noindex', () => {
    assert.match(read('thank-you.html'), /<meta name="robots" content="noindex/);
  });

  test('sitemap.xml lists every indexable page', () => {
    assert.ok(existsSync(join(ROOT, 'sitemap.xml')), 'sitemap.xml missing');
    const xml = read('sitemap.xml');
    for (const page of INDEXABLE) {
      const loc = page === 'index.html' ? SITE : SITE + page;
      assert.ok(xml.includes(`<loc>${loc}</loc>`), `sitemap missing ${loc}`);
    }
    assert.doesNotMatch(xml, /thank-you/);
  });

  test('robots.txt references the sitemap', () => {
    assert.match(read('robots.txt'), new RegExp(`^Sitemap: ${SITE}sitemap.xml$`, 'm'));
  });
});

describe('links and assets', () => {
  for (const page of PAGES) {
    const html = read(page);
    test(`${page}: in-page anchors resolve`, () => {
      const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(id), `#${id} has no target`);
    });
    test(`${page}: local files exist`, () => {
      for (const [, ref] of html.matchAll(/(?:href|src)="(?![a-z]+:|\/\/|#)([^"#?]*)[^"]*"/gi)) {
        assert.ok(existsSync(join(ROOT, ref.replace(/^\//, ''))), `${ref} missing`);
      }
    });
    test(`${page}: images under 250 KB`, () => {
      for (const [, src] of html.matchAll(/<img[^>]+src="([^"#:?]+)"/g)) {
        const kb = statSync(join(ROOT, src)).size / 1024;
        assert.ok(kb < 250, `${src} is ${kb.toFixed(0)} KB`);
      }
    });
  }
});
