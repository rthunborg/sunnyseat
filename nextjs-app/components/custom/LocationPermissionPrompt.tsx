'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface LocationPermissionPromptProps {
  permissionStatus: 'granted' | 'denied' | 'prompt' | null;
  onRequestLocation: () => void;
  onDismiss: () => void;
}

const PROMPTED_KEY = 'sunnyseat-location-prompted';

export function LocationPermissionPrompt({
  permissionStatus,
  onRequestLocation,
  onDismiss,
}: LocationPermissionPromptProps) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (permissionStatus === 'granted' || permissionStatus === 'denied') {
      setVisible(false);
      return;
    }
    try {
      const prompted = sessionStorage.getItem(PROMPTED_KEY);
      if (!prompted) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, [permissionStatus]);

  if (!visible) return null;

  const handleAllow = () => {
    try {
      sessionStorage.setItem(PROMPTED_KEY, 'true');
    } catch {}
    onRequestLocation();
    setVisible(false);
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(PROMPTED_KEY, 'true');
    } catch {}
    setVisible(false);
    onDismiss();
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
      aria-hidden="false"
    >
      <div
        role="dialog"
        aria-labelledby="location-prompt-title"
        data-testid="location-prompt"
        className="bg-surface-primary rounded-card shadow-elevated max-w-[320px] p-6 pointer-events-auto"
      >
        <p
          id="location-prompt-title"
          className="text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] text-text-primary text-center mb-4"
        >
          {t('home.locationTitle')}
        </p>
        <Button
          onClick={handleAllow}
          className="w-full h-[56px] rounded-button bg-brand-primary text-white hover:bg-brand-primary-dark text-[length:var(--font-size-body)] leading-[var(--line-height-body)] font-semibold"
        >
          {t('home.allowLocation')}
        </Button>
        <button
          onClick={handleDismiss}
          className="w-full mt-4 text-center text-brand-primary-dark underline text-[length:var(--font-size-body)] leading-[var(--line-height-body)] bg-transparent border-none cursor-pointer p-2"
          type="button"
        >
          {t('home.chooseOnMap')}
        </button>
      </div>
    </div>
  );
}
