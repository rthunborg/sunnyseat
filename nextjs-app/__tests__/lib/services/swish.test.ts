import { describe, it, expect, vi, beforeEach } from 'vitest';

// Clear env before import so mock mode is used
beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Swish service (mock mode)', () => {
  it('createPaymentRequest returns mock payment ID', async () => {
    const { createPaymentRequest } = await import('@/lib/services/swish');

    const result = await createPaymentRequest(39, 'https://example.com/callback', 'ref-123');

    expect(result.paymentId).toMatch(/^mock-/);
    expect(result.paymentRequestToken).toMatch(/^token-mock-/);
  });

  it('getPaymentStatus returns PAID in mock mode', async () => {
    const { getPaymentStatus } = await import('@/lib/services/swish');

    const result = await getPaymentStatus('mock-test-id');

    expect(result.id).toBe('mock-test-id');
    expect(result.status).toBe('PAID');
    expect(result.amount).toBe(39.0);
    expect(result.currency).toBe('SEK');
    expect(result.datePaid).toBeDefined();
  });

  it('getSwishRedirectUrl generates correct URL', async () => {
    const { getSwishRedirectUrl } = await import('@/lib/services/swish');

    const url = getSwishRedirectUrl('token-abc');

    expect(url).toBe('swish://paymentrequest?token=token-abc&callbackurl=');
  });

  it('getSwishQrCode returns data URI in mock mode', async () => {
    const { getSwishQrCode } = await import('@/lib/services/swish');

    const qr = getSwishQrCode('token-xyz');

    expect(qr).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});
