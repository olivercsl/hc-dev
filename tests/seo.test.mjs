// Keyword placement from seo/keyword-plan.md (homepage map). Keeps copy rewrites from dropping SEO.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

describe('homepage keyword placement', () => {
  test('title targets managed Microsoft 365 services in Sydney', () => {
    assert.match(title, /Managed Microsoft 365/);
    assert.match(title, /Services/);
    assert.match(title, /Sydney/);
    assert.match(title, /Harbour Cloud/);
  });

  test('meta description covers managed Microsoft 365, Australia and Microsoft CSP partner', () => {
    assert.match(description, /Managed Microsoft 365/);
    assert.match(description, /Australia/);
    assert.match(description, /Microsoft CSP partner/i);
  });

  test('h1 leads with "Managed Microsoft 365"', () => {
    assert.match(h1, /^Managed Microsoft 365\b/);
    assert.match(h1, /Azure services/);
  });

  test('h2s carry one keyword cluster each', () => {
    const joined = h2s.join(' | ');
    for (const kw of [/Managed Microsoft 365/, /Microsoft 365 security/, /Microsoft 365 support/, /Azure managed services/, /Microsoft CSP partner/, /financial services/i, /Microsoft 365 expert/]) {
      assert.match(joined, kw, `no h2 matches ${kw}: ${joined}`);
    }
  });

  test('body covers the supporting terms', () => {
    for (const kw of [/Business Premium/, /\bE3\b/, /\bE5\b/, /Essential Eight/, /conditional access/i, /Intune/, /Entra ID/, /Purview/, /security review/i, /Copilot readiness/i, /Azure OpenAI/, /Azure AI Foundry/, /Azure cost/i, /local LLMs?/i, /Sydney/, /Australia/]) {
      assert.match(body, kw, `body missing ${kw}`);
    }
  });

  test('no keyword stuffing: "Microsoft 365" under 3% of words', () => {
    const words = body.split(' ').length;
    const hits = (body.match(/Microsoft 365/g) ?? []).length;
    assert.ok(hits / words < 0.03, `${hits} mentions in ${words} words`);
  });
});

describe('service schema', () => {
  test('JSON-LD lists the six services in an OfferCatalog without prices', () => {
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const biz = data['@graph'].find((i) => i['@type'] === 'ProfessionalService');
    const names = biz?.hasOfferCatalog?.itemListElement?.map((o) => o.itemOffered?.name) ?? [];
    for (const s of ['Managed Microsoft 365', 'Microsoft 365 Security Hardening', 'Microsoft Copilot Readiness', 'Azure and AI Workloads', 'Licensing and Renewals', 'Microsoft CSP Partner Services']) {
      assert.ok(names.includes(s), `OfferCatalog missing "${s}" (has: ${names.join(', ')})`);
    }
    assert.doesNotMatch(JSON.stringify(biz), /"price|priceRange|priceSpecification/);
  });
});
