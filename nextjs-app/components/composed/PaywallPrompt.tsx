'use client';

import { useState, useCallback } from 'react';
import { usePremiumContext } from '@/lib/context/PremiumContext';

interface PaywallPromptProps {
  onDismiss: () => void;
}

type PaywallState = 'prompt' | 'loading' | 'qr' | 'error';

export function PaywallPrompt({ onDismiss }: PaywallPromptProps) {
  const { initiatePurchase, refreshStatus } = usePremiumContext();
  const [state, setState] = useState<PaywallState>('prompt');
  const [qrCode, setQrCode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handlePurchase = useCallback(async () => {
    setState('loading');
    setErrorMessage('');

    const result = await initiatePurchase();

    if (!result) {
      // Either already premium or error
      await refreshStatus();
      setState('error');
      setErrorMessage('Betalningen kunde inte skapas. Försök igen.');
      return;
    }

    // Try Swish app redirect on mobile
    if (result.swishUrl && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
      window.location.href = result.swishUrl;
      // Poll for completion after redirect
      const pollInterval = setInterval(async () => {
        await refreshStatus();
      }, 3000);
      setTimeout(() => clearInterval(pollInterval), 120000);
      return;
    }

    // Show QR code on desktop
    setQrCode(result.qrCode);
    setState('qr');

    // Poll for payment completion
    const pollInterval = setInterval(async () => {
      await refreshStatus();
    }, 3000);
    setTimeout(() => {
      clearInterval(pollInterval);
      setState('error');
      setErrorMessage('Betalningen tog för lång tid. Försök igen.');
    }, 120000);
  }, [initiatePurchase, refreshStatus]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="paywall-title" className="text-xl font-bold text-gray-900">
          SunnySeat Premium
        </h2>
        <p className="mt-1 text-2xl font-bold text-amber-600">39 kr/säsong</p>

        {state === 'prompt' && (
          <>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-amber-500" aria-hidden="true">&#9728;</span>
                Tidslinje — se sol timme för timme
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-500" aria-hidden="true">&#9728;</span>
                Datumväljare — planera framåt
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-500" aria-hidden="true">&#9728;</span>
                Stöd utvecklingen av SunnySeat
              </li>
            </ul>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handlePurchase}
                className="min-h-[48px] w-full rounded-xl bg-[#00A3E0] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#0090C5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A3E0]"
              >
                Betala med Swish
              </button>
              <button
                onClick={onDismiss}
                className="min-h-[48px] w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-600 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
              >
                Inte nu
              </button>
            </div>
          </>
        )}

        {state === 'loading' && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#00A3E0]"
              role="status"
              aria-label="Laddar betalning"
            />
            <p className="text-sm text-gray-600">Skapar betalning...</p>
          </div>
        )}

        {state === 'qr' && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <p className="text-sm text-gray-600">Skanna QR-koden med Swish-appen</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="Swish QR-kod för betalning"
              width={200}
              height={200}
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500">Väntar på betalning...</p>
            <button
              onClick={onDismiss}
              className="min-h-[48px] w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-600 transition-colors hover:bg-gray-50"
            >
              Avbryt
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
            <button
              onClick={() => setState('prompt')}
              className="min-h-[48px] w-full rounded-xl bg-[#00A3E0] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#0090C5]"
            >
              Försök igen
            </button>
            <button
              onClick={onDismiss}
              className="min-h-[48px] w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-600 transition-colors hover:bg-gray-50"
            >
              Avbryt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
