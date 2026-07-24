import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('Story 12.9 row-sheet source contracts', () => {
  it('measures the mobile row sheet in layout effects so first paint uses measured height', () => {
    const source = read('components/custom/sheets/MobileBottomSheet.tsx');

    expect(source).toMatch(/useLayoutEffect/);
    expect(source).toMatch(/useLayoutEffect\(\(\)\s*=>\s*\{\s*measure\(\);/);
    expect(source).not.toMatch(/useEffect\(\(\)\s*=>\s*\{\s*measure\(\);/);
  });
});
