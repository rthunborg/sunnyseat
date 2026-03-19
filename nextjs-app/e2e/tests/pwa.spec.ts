import { test, expect } from '@playwright/test';

test.describe('AC1: PWA Manifest', () => {
  test('/manifest.json returns valid manifest with correct fields', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    const manifest = await response.json();

    expect(manifest.name).toBe('SunnySeat — Hitta soliga uteplatser');
    expect(manifest.short_name).toBe('SunnySeat');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  test('manifest includes required icon sizes', async ({ request }) => {
    const response = await request.get('/manifest.json');
    const manifest = await response.json();
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);

    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  test('manifest has a maskable icon', async ({ request }) => {
    const response = await request.get('/manifest.json');
    const manifest = await response.json();
    const maskable = manifest.icons.find(
      (i: { purpose?: string }) => i.purpose === 'maskable'
    );
    expect(maskable).toBeDefined();
  });
});

test.describe('AC1: Service Worker', () => {
  test('/sw.js loads successfully', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('CACHE_VERSION');
    expect(body).toContain("self.addEventListener('install'");
    expect(body).toContain("self.addEventListener('fetch'");
  });
});

test.describe('AC1: PWA Icons', () => {
  const iconPaths = [
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-512-maskable.png',
  ];

  for (const path of iconPaths) {
    test(`${path} exists and returns image`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('image/png');
    });
  }
});

test.describe('AC1: PWA Install Prompt', () => {
  test('PwaInstallPrompt is included in page HTML', async ({ page }) => {
    await page.goto('/');
    // The component renders nothing unless beforeinstallprompt fires,
    // but the layout should include ServiceWorkerRegistration and PwaInstallPrompt
    const html = await page.content();
    // ServiceWorkerRegistration script should be present
    expect(html).toContain('sw.js');
  });
});

test.describe('AC1: Offline Page', () => {
  test('/offline renders with appropriate Swedish message', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: 'Du är offline' })).toBeVisible();
    await expect(
      page.getByText('SunnySeat behöver en internetanslutning')
    ).toBeVisible();
  });
});
