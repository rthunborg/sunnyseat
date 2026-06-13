import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Story 3.4 Task 6.3 — sv/en message key parity pin.
 *
 * Swedish is the source language; English is the fallback. Every key a flow
 * consumes must exist in both locales, otherwise next-intl falls back to raw
 * key names at runtime. This test pins structural parity for every message
 * namespace in both directions so a key added to one locale cannot silently
 * ship without its counterpart. It also pins ICU placeholder parity per key
 * (review R1-P9): a `{minutes}` dropped from one locale passes key-set
 * equality while breaking runtime formatting in that locale.
 */

const MESSAGES_DIR = path.resolve(process.cwd(), 'messages');

function listNamespaces(locale: string): string[] {
  return readdirSync(path.join(MESSAGES_DIR, locale))
    .filter((file) => file.endsWith('.json'))
    .sort();
}

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  const entries = Object.entries(value as Record<string, unknown>);
  // An empty object is a leaf too (review R1-P8): without this, a locale
  // shipping `"section": {}` flattens identically to a locale missing
  // `section` entirely and the divergence passes "parity".
  if (entries.length === 0) {
    return [`${prefix}.<empty>`];
  }
  return entries.flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function flattenLeafStrings(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') {
    return [[prefix, value]];
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenLeafStrings(child, prefix ? `${prefix}.${key}` : key),
  );
}

function loadNamespace(locale: string, namespaceFile: string): unknown {
  const raw = readFileSync(path.join(MESSAGES_DIR, locale, namespaceFile), 'utf8');
  return JSON.parse(raw);
}

function loadKeys(locale: string, namespaceFile: string): string[] {
  return flattenKeys(loadNamespace(locale, namespaceFile)).sort();
}

/**
 * Extracts ICU argument names: `{minutes}` and `{count, plural, ...}` yield
 * `minutes` / `count`, while plural/select option bodies (`{Inga omdömen}`,
 * `{# omdöme}`) are recursed as text so branch words are never mistaken for
 * arguments but nested arguments inside branches are still found.
 */
function icuPlaceholders(message: string): string[] {
  const args = new Set<string>();
  collectIcuArgs(message, args);
  return [...args].sort();
}

function collectIcuArgs(text: string, args: Set<string>): void {
  for (const inner of topLevelBraceBlocks(text)) {
    const argMatch = /^\s*([A-Za-z0-9_]+)\s*(?:,([\s\S]*))?$/.exec(inner);
    if (!argMatch) continue;
    args.add(argMatch[1]);
    const rest = argMatch[2];
    if (!rest) continue;
    const optionsMatch = /^\s*(?:plural|select|selectordinal)\s*,([\s\S]*)$/.exec(rest);
    if (!optionsMatch) continue;
    for (const optionBody of topLevelBraceBlocks(optionsMatch[1])) {
      collectIcuArgs(optionBody, args);
    }
  }
}

function topLevelBraceBlocks(text: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let start = -1;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') {
      if (depth === 0) start = index + 1;
      depth += 1;
    } else if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        blocks.push(text.slice(start, index));
        start = -1;
      }
    }
  }
  return blocks;
}

describe('sv/en message parity (Story 3.4 AC #5)', () => {
  it('ships the same namespace files for both locales', () => {
    expect(listNamespaces('sv')).toEqual(listNamespaces('en'));
  });

  for (const namespaceFile of listNamespaces('sv')) {
    it(`keeps identical key sets in ${namespaceFile} for sv and en`, () => {
      expect(loadKeys('en', namespaceFile)).toEqual(loadKeys('sv', namespaceFile));
    });

    it(`keeps identical ICU placeholders per key in ${namespaceFile} for sv and en`, () => {
      const sv = new Map(flattenLeafStrings(loadNamespace('sv', namespaceFile)));
      const en = new Map(flattenLeafStrings(loadNamespace('en', namespaceFile)));
      const mismatches: string[] = [];
      for (const [key, svMessage] of sv) {
        const enMessage = en.get(key);
        if (enMessage === undefined) continue; // key-set test reports this
        const svArgs = icuPlaceholders(svMessage);
        const enArgs = icuPlaceholders(enMessage);
        if (svArgs.join(',') !== enArgs.join(',')) {
          mismatches.push(`${key}: sv [${svArgs.join(', ')}] vs en [${enArgs.join(', ')}]`);
        }
      }
      expect(mismatches).toEqual([]);
    });
  }

  it('covers the Epic 3 route/feedback/review namespaces', () => {
    const namespaces = listNamespaces('sv');
    expect(namespaces).toContain('venue.json');
    expect(namespaces).toContain('feedback.json');
  });
});
