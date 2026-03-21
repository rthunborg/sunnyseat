'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { getAmbientToneClass } from '@/lib/hooks/useAmbientTone';

function SunIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="7" fill="var(--color-sky-clear, #FBBF24)" />
      <g stroke="var(--color-sky-clear, #FBBF24)" strokeWidth="2" strokeLinecap="round">
        <line x1="16" y1="2" x2="16" y2="5" />
        <line x1="16" y1="27" x2="16" y2="30" />
        <line x1="2" y1="16" x2="5" y2="16" />
        <line x1="27" y1="16" x2="30" y2="16" />
        <line x1="6.1" y1="6.1" x2="8.2" y2="8.2" />
        <line x1="23.8" y1="23.8" x2="25.9" y2="25.9" />
        <line x1="6.1" y1="25.9" x2="8.2" y2="23.8" />
        <line x1="23.8" y1="8.2" x2="25.9" y2="6.1" />
      </g>
    </svg>
  );
}

function BuildingShadowIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="8" y="6" width="10" height="20" rx="1" fill="var(--color-sky-overcast, #94A3B8)" />
      <rect x="10" y="9" width="2" height="2" rx="0.5" fill="var(--color-surface-primary, #fff)" />
      <rect x="14" y="9" width="2" height="2" rx="0.5" fill="var(--color-surface-primary, #fff)" />
      <rect x="10" y="14" width="2" height="2" rx="0.5" fill="var(--color-surface-primary, #fff)" />
      <rect x="14" y="14" width="2" height="2" rx="0.5" fill="var(--color-surface-primary, #fff)" />
      <path d="M18 26L26 26L18 12Z" fill="var(--color-sky-overcast, #94A3B8)" opacity="0.35" />
    </svg>
  );
}

function WeatherCloudIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="14" cy="12" r="5" fill="var(--color-sky-clear, #FBBF24)" />
      <path
        d="M8 22a5.5 5.5 0 0 1 10.6-2A4.5 4.5 0 1 1 26 22H8z"
        fill="var(--color-sky-overcast, #94A3B8)"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0 mt-0.5"
    >
      <circle cx="10" cy="10" r="9" stroke="var(--color-status-info, #2563EB)" strokeWidth="1.5" fill="none" />
      <line x1="10" y1="9" x2="10" y2="14" stroke="var(--color-status-info, #2563EB)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="1" fill="var(--color-status-info, #2563EB)" />
    </svg>
  );
}

function SunWordmark() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="10" fill="var(--color-sky-clear, #FBBF24)" />
      <g stroke="var(--color-sky-clear, #FBBF24)" strokeWidth="2.5" strokeLinecap="round">
        <line x1="20" y1="2" x2="20" y2="6" />
        <line x1="20" y1="34" x2="20" y2="38" />
        <line x1="2" y1="20" x2="6" y2="20" />
        <line x1="34" y1="20" x2="38" y2="20" />
        <line x1="7.3" y1="7.3" x2="10.1" y2="10.1" />
        <line x1="29.9" y1="29.9" x2="32.7" y2="32.7" />
        <line x1="7.3" y1="32.7" x2="10.1" y2="29.9" />
        <line x1="29.9" y1="10.1" x2="32.7" y2="7.3" />
      </g>
    </svg>
  );
}

const steps = [
  { icon: SunIcon, titleKey: 'about.step1Title', descKey: 'about.step1Desc' },
  { icon: BuildingShadowIcon, titleKey: 'about.step2Title', descKey: 'about.step2Desc' },
  { icon: WeatherCloudIcon, titleKey: 'about.step3Title', descKey: 'about.step3Desc' },
] as const;

const dataSources = [
  { nameKey: 'about.sourceMetNo', descKey: 'about.sourceMetNoDesc' },
  { nameKey: 'about.sourceSmhi', descKey: 'about.sourceSmhiDesc' },
  { nameKey: 'about.sourceOsm', descKey: 'about.sourceOsmDesc' },
  { nameKey: 'about.sourceLantmateriet', descKey: 'about.sourceLantmaterietDesc' },
] as const;

export function AboutContent() {
  const { t } = useLanguage();
  const ambientClass = getAmbientToneClass('sunny');

  return (
    <main
      id="main-content"
      className={`min-h-screen px-4 py-8 ${ambientClass}`}
      role="main"
    >
      <div className="max-w-2xl mx-auto">
        {/* Navigation */}
        <nav aria-label={t('common.back')} className="pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary min-h-[var(--spacing-touch-min)] px-2 -ml-2 rounded-button hover:bg-surface-secondary transition-colors"
          >
            <span aria-hidden="true">←</span> {t('about.backToMap')}
          </Link>
        </nav>

        {/* Hero Section */}
        <section aria-labelledby="about-title" className="text-center pb-8">
          <div className="flex justify-center pb-3">
            <SunWordmark />
          </div>
          <h1
            id="about-title"
            className="text-[length:var(--font-size-title)] leading-[var(--line-height-title)] font-bold text-text-primary mb-2"
          >
            {t('about.title')}
          </h1>
          <p className="text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] text-text-secondary">
            {t('about.tagline')}
          </p>
        </section>

        {/* How It Works Section */}
        <section aria-labelledby="how-it-works-title" className="pb-8">
          <h2
            id="how-it-works-title"
            className="text-[length:var(--font-size-headline)] leading-[var(--line-height-headline)] font-semibold text-text-primary mb-4"
          >
            {t('about.howItWorksTitle')}
          </h2>
          <div className="flex flex-col md:flex-row gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.titleKey}
                  className="flex-1 bg-surface-primary rounded-card shadow-card p-4 flex flex-col items-center text-center"
                >
                  <div className="mb-2 flex items-center justify-center w-12 h-12 rounded-full bg-surface-secondary">
                    <Icon />
                  </div>
                  <p className="text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] font-medium text-text-muted mb-1">
                    {i + 1}.
                  </p>
                  <h3 className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] font-semibold text-text-primary mb-1">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] text-text-secondary">
                    {t(step.descKey)}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Data Sources Section */}
        <section aria-labelledby="data-sources-title" className="pb-8">
          <h2
            id="data-sources-title"
            className="text-[length:var(--font-size-headline)] leading-[var(--line-height-headline)] font-semibold text-text-primary mb-4"
          >
            {t('about.dataSourcesTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.map((source) => (
              <article
                key={source.nameKey}
                className="bg-surface-primary rounded-card shadow-card p-4"
              >
                <h3 className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] font-semibold text-text-primary mb-1">
                  {t(source.nameKey)}
                </h3>
                <p className="text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] text-text-secondary">
                  {t(source.descKey)}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Disclaimer Callout */}
        <section aria-labelledby="disclaimer-title" className="pb-8">
          <div className="flex gap-3 bg-surface-secondary border border-border-subtle rounded-card p-4">
            <InfoIcon />
            <div>
              <h2
                id="disclaimer-title"
                className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] font-semibold text-text-primary mb-1"
              >
                {t('about.disclaimerTitle')}
              </h2>
              <p className="text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] text-text-muted">
                {t('about.disclaimerText')}
              </p>
            </div>
          </div>
        </section>

        {/* Feedback Section */}
        <section aria-labelledby="feedback-title" className="pb-8">
          <h2
            id="feedback-title"
            className="text-[length:var(--font-size-headline)] leading-[var(--line-height-headline)] font-semibold text-text-primary mb-2"
          >
            {t('about.feedbackTitle')}
          </h2>
          <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary">
            {t('about.feedbackText')}
          </p>
        </section>
      </div>
    </main>
  );
}
