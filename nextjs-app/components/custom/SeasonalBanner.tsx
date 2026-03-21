'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';

const STORAGE_KEY = 'sunnyseat-seasonal-banner-dismissed';

function isWinterMonth(): boolean {
  const month = new Date().getMonth(); // 0-indexed
  return month >= 10 || month <= 1; // Nov(10), Dec(11), Jan(0), Feb(1)
}

export function SeasonalBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isWinterMonth()) return;
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="bg-ambient-winter text-text-primary px-4 py-3 flex items-center justify-between gap-3"
    >
      <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)]">
        {t('seasonalBanner.winterMessage')}
      </p>
      <button
        onClick={handleDismiss}
        aria-label={t('common.close')}
        className="shrink-0 min-w-[var(--spacing-touch-min)] min-h-[var(--spacing-touch-min)] flex items-center justify-center rounded-button hover:bg-surface-secondary/20 transition-colors"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
