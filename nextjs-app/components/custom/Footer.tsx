'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export function Footer() {
  const { t, language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'sv' ? 'en' : 'sv');
  };

  return (
    <footer className="border-t border-border-default bg-surface-primary px-4 py-6">
      <div className="max-w-prose mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] text-text-muted space-y-1">
          <p>{t('footer.copyright')}</p>
          <p>{t('footer.dataSources')}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/about"
            className="text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] text-text-secondary hover:text-text-primary transition-colors min-h-[var(--spacing-touch-min)] inline-flex items-center"
          >
            {t('footer.about')}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            aria-label={t('footer.switchLanguage')}
          >
            {language === 'sv' ? 'EN' : 'SV'}
          </Button>
        </div>
      </div>
    </footer>
  );
}
