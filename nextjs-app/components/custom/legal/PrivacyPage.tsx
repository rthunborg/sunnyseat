import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const FOCUS_LINK_CLASSNAME =
  'outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:rounded-sm';

/**
 * Minimal privacy policy page (`/sekretess`) backing the About page's
 * NFR16 privacy link. Plain scrolling content; copy lives in the `privacy`
 * i18n scope.
 */
export type PrivacyPageCopy = {
  title: string;
  backLink: string;
  intro: string;
  body1: string;
  body2: string;
  lastUpdated: string;
};

export async function PrivacyPage() {
  const t = await getTranslations('privacy');
  return <PrivacyPageView copy={{
    title: t('title'),
    backLink: t('backLink'),
    intro: t('intro'),
    body1: t('body1'),
    body2: t('body2'),
    lastUpdated: t('lastUpdated'),
  }} />;
}

export function PrivacyPageView({ copy }: { copy: PrivacyPageCopy }) {
  return (
    <article
      data-testid="privacy-page"
      className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-3 lg:px-6 lg:pb-16 lg:pt-10"
    >
      <div className="mb-6 flex items-center lg:hidden">
        <Link
          href="/about"
          data-testid="privacy-back-link"
          className={`inline-flex min-h-11 items-center text-label-lg text-amber-dark ${FOCUS_LINK_CLASSNAME}`}
        >
          {copy.backLink}
        </Link>
      </div>

      <h1 className="text-display-xl text-text-primary lg:text-center">{copy.title}</h1>

      <div className="mt-6 flex flex-col gap-4 text-body-lg text-text-body">
        <p>{copy.intro}</p>
        <p>{copy.body1}</p>
        <p>{copy.body2}</p>
        <p className="text-body-sm text-text-body">{copy.lastUpdated}</p>
      </div>
    </article>
  );
}
