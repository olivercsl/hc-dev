// Keyword placement from seo/keyword-plan.md v2 (AI-led homepage map).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

const strip = (s) =>
  s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
const h1 = strip(html.match(/<h1[\s\S]*?<\/h1>/i)?.[0] ?? '');
const h2s = [...html.matchAll(/<h2[\s\S]*?<\/h2>/gi)].map((m) => strip(m[0]));
const body = strip(html);

describe('homepage keyword placement (AI-led)', () => {
  test('title covers Azure, AWS and AI in Sydney', () => {
    assert.match(title, /Azure/);
    assert.match(title, /AWS/);
    assert.match(title, /AI/);
    assert.match(title, /Sydney/);
    assert.match(title, /Harbour Cloud/);
  });

  test('meta description covers AI projects on Azure, Australia and private AI', () => {
    assert.match(description, /AI projects/i);
    assert.match(description, /Azure/);
    assert.match(description, /Australian|Australia/);
    assert.match(description, /(private|on-premises)/i);
  });

  test('h1 leads with AI projects on both clouds', () => {
    assert.match(h1, /^AI projects/i);
    assert.match(h1, /Azure/);
    assert.match(h1, /AWS/);
    assert.match(h1, /(built and run|design)/i);
  });

  test('h2s carry one keyword cluster each', () => {
    const joined = h2s.join(' | ');
    for (const kw of [
      /Azure AI (development|projects)/i,
      /AI agents/i,
      /(private|on-premises) AI/i,
      /Copilot/i,
      /(Microsoft 365 licensing|Managed Microsoft 365|Microsoft licensing)/i,
      /\bAWS\b/,
      /Microsoft CSP partner/i,
      /financial services/i,
      /AI and Azure expert|AI expert/i,
    ]) {
      assert.match(joined, kw, `no h2 matches ${kw}: ${joined}`);
    }
  });

  test('AI clusters lead the page, Microsoft foundation follows', () => {
    const firstAi = body.search(/Azure AI/i);
    const firstManaged = body.search(/Microsoft 365 licensing|Managed Microsoft 365/i);
    assert.ok(firstAi > -1 && firstManaged > -1, 'both themes must appear');
    assert.ok(firstAi < firstManaged, 'AI must appear before managed Microsoft 365');
  });

  test('body covers the AI supporting terms', () => {
    for (const kw of [/Azure OpenAI/, /Azure AI Foundry/, /AI agents?/i, /document/i, /proof of concept/i, /AI readiness/i, /data governance/i, /on-premises/i, /open-source models/i, /local LLMs?/i, /Azure cost/i]) {
      assert.match(body, kw, `body missing ${kw}`);
    }
  });

  test('body keeps the Microsoft supporting terms', () => {
    for (const kw of [/Business Premium/, /\bE3\b/, /\bE5\b/, /Essential Eight/, /conditional access/i, /Intune/, /Entra ID/, /Purview/, /security review/i, /Copilot readiness/i, /Sydney/, /Australia/, /\bAWS\b/, /reseller/i, /(AWS accounts|AWS billing|AWS cost)/i]) {
      assert.match(body, kw, `body missing ${kw}`);
    }
  });

  test('no keyword stuffing: neither "AI" nor "Microsoft 365" over 3% of words', () => {
    const words = body.split(' ').length;
    for (const re of [/\bAI\b/g, /Microsoft 365/g]) {
      const hits = (body.match(re) ?? []).length;
      assert.ok(hits / words < 0.03, `${re} appears ${hits} times in ${words} words`);
    }
  });
});

describe('social sharing', () => {
  test('Open Graph and Twitter image tags point at a real file', () => {
    const image = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    assert.ok(image, 'og:image missing');
    assert.match(image, /^https:\/\/harbourcloud\.com\.au\//, 'og:image must be an absolute URL');
    const local = join(ROOT, image.replace('https://harbourcloud.com.au/', ''));
    assert.ok(existsSync(local), `og:image file missing: ${local}`);
    assert.ok(statSync(local).size < 500 * 1024, 'og:image over 500 KB');
    assert.match(html, /<meta property="og:image:width" content="1200"/);
    assert.match(html, /<meta property="og:image:height" content="630"/);
    assert.ok(html.match(/<meta property="og:image:alt" content="([^"]{10,})"/), 'og:image:alt missing');
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
  });
});

describe('answers the questions people search', () => {
  const faq = html.match(/<section[^>]*\sid="faq"[\s\S]*?<\/section>/i)?.[0];

  test('an FAQ section exists with at least six questions', () => {
    assert.ok(faq, 'section#faq missing');
    const questions = [...faq.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) => strip(m[0]));
    assert.ok(questions.length >= 6, `only ${questions.length} questions`);
    assert.ok(questions.every((q) => q.includes('?')), `every FAQ heading should be a question: ${questions.join(' | ')}`);
  });

  test('FAQ covers the buying questions from the keyword plan', () => {
    const t = strip(faq ?? '');
    for (const kw of [/AWS account/i, /billing/i, /CSP|Cloud Solution Provider/, /migrat/i, /Business Premium|E3|E5/, /Copilot/i, /on-premises|private/i]) {
      assert.match(t, kw, `FAQ missing ${kw}`);
    }
  });

  test('FAQPage schema matches the visible questions', () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const graph = blocks.flatMap((b) => b['@graph'] ?? [b]);
    const faqSchema = graph.find((i) => i['@type'] === 'FAQPage');
    assert.ok(faqSchema, 'FAQPage schema missing');
    const schemaQs = faqSchema.mainEntity.map((q) => q.name);
    const visibleQs = [...(faq ?? '').matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) => strip(m[0]));
    assert.equal(schemaQs.length, visibleQs.length, 'schema and visible question counts differ');
    for (const q of visibleQs) assert.ok(schemaQs.includes(q), `schema missing visible question: ${q}`);
    for (const a of faqSchema.mainEntity) assert.ok((a.acceptedAnswer?.text ?? '').length > 40, `answer too short for: ${a.name}`);
  });
});

describe('crawlability and structure', () => {
  test('page uses a main landmark and labelled sections', () => {
    assert.match(html, /<main[\s>]/, 'no <main> landmark');
    const sections = [...html.matchAll(/<section[^>]*>/g)];
    const labelled = sections.filter((s) => /aria-labelledby=/.test(s[0]));
    assert.ok(labelled.length >= sections.length - 1, `${sections.length - labelled.length} sections lack aria-labelledby`);
  });

  test('a 404 page exists and is noindex', () => {
    const p = join(ROOT, '404.html');
    assert.ok(existsSync(p), '404.html missing');
    assert.match(readFileSync(p, 'utf8'), /<meta name="robots" content="noindex/);
  });

  test('sitemap lastmod is current', () => {
    const xml = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
    const dates = [...xml.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)].map((m) => m[1]);
    assert.ok(dates.length > 0, 'no lastmod dates');
    const newest = dates.sort().at(-1);
    const ageDays = (Date.now() - Date.parse(newest)) / 86400000;
    assert.ok(ageDays < 30, `sitemap lastmod ${newest} is ${Math.round(ageDays)} days old`);
  });
});

describe('service schema', () => {
  test('JSON-LD lists the services in an OfferCatalog without prices', () => {
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const biz = data['@graph'].find((i) => i['@type'] === 'ProfessionalService');
    const names = biz?.hasOfferCatalog?.itemListElement?.map((o) => o.itemOffered?.name) ?? [];
    for (const s of [
      'Azure AI Projects',
      'AI Agents and Automation',
      'Private AI Inference',
      'Microsoft Copilot Readiness',
      'Managed Microsoft 365',
      'Microsoft 365 Security Hardening',
      'Licensing and Renewals',
      'Microsoft CSP Partner Services',
    ]) {
      assert.ok(names.includes(s), `OfferCatalog missing "${s}" (has: ${names.join(', ')})`);
    }
    assert.ok(names.indexOf('Azure AI Projects') < names.indexOf('Managed Microsoft 365'), 'AI services listed first');
    assert.doesNotMatch(JSON.stringify(biz), /"price|priceRange|priceSpecification/);
  });
});
