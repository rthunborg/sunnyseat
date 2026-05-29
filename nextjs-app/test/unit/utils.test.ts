import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    const result = cn('p-4', 'p-8');
    expect(result).toBe('p-8');
  });

  it('keeps independent axis utilities', () => {
    expect(cn('gap-x-2', 'gap-y-3')).toBe('gap-x-2 gap-y-3');
    expect(cn('overflow-x-auto', 'overflow-y-hidden')).toBe('overflow-x-auto overflow-y-hidden');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });
});
