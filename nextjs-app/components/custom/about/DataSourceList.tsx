'use client';

import { Building2, CloudSun, Clock, Landmark, Map, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

type DataSource = {
  key: string;
  icon: LucideIcon;
  nameKey: string;
  descKey: string;
};

/**
 * User-safe source names only — no EPSG / Baskarta layer
 * names / DTM / RPC internals (Story 3.0.6 contract). Informational: tapping a
 * source does nothing.
 */
const DATA_SOURCES: readonly DataSource[] = [
  { key: 'lantmateriet', icon: Landmark, nameKey: 'sourceLantmaterietName', descKey: 'sourceLantmaterietDesc' },
  { key: 'goteborg', icon: Building2, nameKey: 'sourceGoteborgName', descKey: 'sourceGoteborgDesc' },
  { key: 'metno', icon: CloudSun, nameKey: 'sourceMetnoName', descKey: 'sourceMetnoDesc' },
  { key: 'venueFacts', icon: Clock, nameKey: 'sourceVenueFactsName', descKey: 'sourceVenueFactsDesc' },
  { key: 'osm', icon: Map, nameKey: 'sourceOsmName', descKey: 'sourceOsmDesc' },
];

export function DataSourceList() {
  const t = useTranslations('about');

  return (
    <ul data-testid="about-data-sources" className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {DATA_SOURCES.map(({ key, icon: Icon, nameKey, descKey }) => (
        <li
          key={key}
          data-testid={`about-data-source-${key}`}
          className="flex gap-3 rounded-card bg-surface-muted p-4"
        >
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-badge bg-surface-icon-bg text-amber-dark"
          >
            <Icon className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-label-lg text-text-primary">{t(nameKey)}</span>
            <span className="text-body-sm text-text-body">{t(descKey)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
