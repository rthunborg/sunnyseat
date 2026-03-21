import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Root layout PWA metadata', () => {
  const layoutPath = join(__dirname, '..', '..', 'app', 'layout.tsx');
  const layoutContent = readFileSync(layoutPath, 'utf-8');

  it('exports manifest link', () => {
    expect(layoutContent).toContain("manifest: '/manifest.json'");
  });

  it('exports viewport with theme color', () => {
    expect(layoutContent).toContain("themeColor: '#0EA5E9'");
  });

  it('configures apple web app capability', () => {
    expect(layoutContent).toContain('appleWebApp');
    expect(layoutContent).toContain('capable: true');
  });

  it('sets apple touch icon', () => {
    expect(layoutContent).toContain('/icons/icon-180.png');
  });

  it('includes ServiceWorkerRegistration component', () => {
    expect(layoutContent).toContain('ServiceWorkerRegistration');
  });

  it('includes PwaInstallPrompt component', () => {
    expect(layoutContent).toContain('PwaInstallPrompt');
  });
});
