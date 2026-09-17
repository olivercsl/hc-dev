// Keyword placement from seo/keyword-plan.md v2 (AI-led homepage map).
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
