import { describe, expect, it } from 'vitest';
import enAbout from '@/messages/en/about.json';
import enVenue from '@/messages/en/venue.json';
import svAbout from '@/messages/sv/about.json';
import svVenue from '@/messages/sv/venue.json';

type MessageTree = string | { [key: string]: MessageTree };

const FORBIDDEN_COPY_TERMS = [
  /Baskarta/i,
  /\bDTM\b/i,
  /\bCRS\b/i,
  /\bEPSG\b/i,
  /import batch/i,
  /source layer/i,
  /byggnad_l/i,
  /högupplösta 3D-modeller/i,
  /imponerande precision/i,
  /perfektion/i,
  /perfection/i,
];

describe('uncertainty copy messages', () => {
  it('keeps Swedish and English uncertainty key structures in sync', () => {
    expect(flattenKeys((svVenue as { uncertainty?: MessageTree }).uncertainty)).toEqual(
      flattenKeys((enVenue as { uncertainty?: MessageTree }).uncertainty),
    );
    expect(flattenKeys(svAbout as MessageTree)).toEqual(flattenKeys(enAbout as MessageTree));
  });

  it('describes building shadows and unmodelled obstructions without internals', () => {
    const strings = [
      ...collectStrings((svVenue as { uncertainty?: MessageTree }).uncertainty),
      ...collectStrings((enVenue as { uncertainty?: MessageTree }).uncertainty),
      ...collectStrings(svAbout as MessageTree),
      ...collectStrings(enAbout as MessageTree),
    ];

    const joined = strings.join(' ').toLocaleLowerCase('sv-SE');
    expect(joined).toContain('byggnadsskuggor');
    expect(joined).toContain('building shadows');
    expect(joined).toContain('träd');
    expect(joined).toContain('trees');
    expect(joined).toContain('markiser');
    expect(joined).toContain('awnings');
    expect(joined).toContain('parasoller');
    expect(joined).toContain('umbrellas');
    expect(joined).toContain('broar');
    expect(joined).toContain('bridges');
    expect(joined).toContain('tillfälliga konstruktioner');
    expect(joined).toContain('temporary structures');

    for (const value of strings) {
      for (const forbidden of FORBIDDEN_COPY_TERMS) {
        expect(value).not.toMatch(forbidden);
      }
    }
  });
});

function flattenKeys(value: MessageTree | undefined, prefix = ''): string[] {
  if (!value || typeof value === 'string') return prefix ? [prefix] : [];
  return Object.keys(value)
    .sort()
    .flatMap((key) => flattenKeys(value[key], prefix ? `${prefix}.${key}` : key));
}

function collectStrings(value: MessageTree | undefined): string[] {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  return Object.values(value).flatMap((child) => collectStrings(child));
}
