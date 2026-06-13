import { expect } from 'vitest';

const SENSITIVE_SOURCE_TERMS = [
  /Baskarta/i,
  /\bDTM\b/i,
  /\bCRS\b/i,
  /\bEPSG\b/i,
  /import\s+batch/i,
  /source[_\s-]?layer/i,
  /byggnad_l/i,
];

export function expectNoSensitiveSourceTerms(output: HTMLElement | string) {
  const renderedOutput = typeof output === 'string' ? output : output.innerHTML;
  for (const term of SENSITIVE_SOURCE_TERMS) {
    expect(renderedOutput).not.toMatch(term);
  }
}
