/**
 * Swish Payment API client
 * Currently uses a mock implementation for development.
 * Replace with real Swish API calls when merchant credentials are available.
 */

const SWISH_MERCHANT_NUMBER = process.env.SWISH_MERCHANT_NUMBER || '1234679304';
const SWISH_API_URL =
  process.env.SWISH_API_URL || 'https://mss.cpc.getswish.net/swish-cpcapi/api/v2';

export interface SwishPaymentRequest {
  payeePaymentReference: string;
  callbackUrl: string;
  payerAlias?: string;
  payeeAlias: string;
  amount: string;
  currency: string;
  message: string;
}

export interface SwishPaymentResponse {
  id: string;
  paymentRequestToken: string;
}

export interface SwishPaymentStatus {
  id: string;
  status: 'CREATED' | 'PAID' | 'DECLINED' | 'ERROR' | 'CANCELLED';
  amount: number;
  currency: string;
  datePaid?: string;
}

/**
 * Create a Swish payment request.
 * In mock mode, returns a simulated payment ID and redirect URL.
 */
export async function createPaymentRequest(
  amount: number,
  callbackUrl: string,
  paymentReference: string,
  payerAlias?: string
): Promise<{ paymentId: string; paymentRequestToken: string }> {
  const isMock = !process.env.SWISH_CERT_PATH;

  if (isMock) {
    const mockId = `mock-${crypto.randomUUID()}`;
    return {
      paymentId: mockId,
      paymentRequestToken: `token-${mockId}`,
    };
  }

  // Real Swish API call (requires mTLS certificates)
  const payload: SwishPaymentRequest = {
    payeePaymentReference: paymentReference,
    callbackUrl,
    payerAlias: payerAlias || '',
    payeeAlias: SWISH_MERCHANT_NUMBER,
    amount: amount.toFixed(2),
    currency: 'SEK',
    message: 'SunnySeat Premium',
  };

  const response = await fetch(`${SWISH_API_URL}/paymentrequests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Swish API error: ${response.status} ${errorText}`);
  }

  const locationHeader = response.headers.get('Location') || '';
  const paymentId = locationHeader.split('/').pop() || '';
  const paymentRequestToken = response.headers.get('PaymentRequestToken') || '';

  return { paymentId, paymentRequestToken };
}

/**
 * Get payment status from Swish.
 * In mock mode, always returns 'PAID'.
 */
export async function getPaymentStatus(paymentId: string): Promise<SwishPaymentStatus> {
  const isMock = !process.env.SWISH_CERT_PATH;

  if (isMock) {
    return {
      id: paymentId,
      status: 'PAID',
      amount: 39.0,
      currency: 'SEK',
      datePaid: new Date().toISOString(),
    };
  }

  const response = await fetch(`${SWISH_API_URL}/paymentrequests/${paymentId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Swish API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Generate a Swish deep link URL for mobile redirect.
 */
export function getSwishRedirectUrl(paymentRequestToken: string): string {
  return `swish://paymentrequest?token=${paymentRequestToken}&callbackurl=`;
}

/**
 * Generate a mock QR code data URL (base64 SVG placeholder).
 * In production, use the Swish QR code API.
 */
export function getSwishQrCode(paymentRequestToken: string): string {
  const isMock = !process.env.SWISH_CERT_PATH;

  if (isMock) {
    // Simple SVG placeholder for QR code
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="90" text-anchor="middle" font-size="14" fill="#333">Swish QR</text>
      <text x="100" y="115" text-anchor="middle" font-size="11" fill="#666">(Mock – dev mode)</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  return `https://mpc.getswish.net/qrg-swish/api/v1/commerce/${paymentRequestToken}?size=300`;
}
