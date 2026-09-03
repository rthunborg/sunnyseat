import { Building2, CloudSun, Clock, Landmark, Map, type LucideIcon } from 'lucide-react';

type DataSource = {
  key: string;
  icon: LucideIcon;
  name: string;
  desc: string;
};

/**
 * User-safe source names only — no EPSG / Baskarta layer
 * names / DTM / RPC internals (Story 3.0.6 contract). Informational: tapping a
 * source does nothing.
 */
const DATA_SOURCE_ICONS = {
  lantmateriet: Landmark,
  goteborg: Building2,
  metno: CloudSun,
  venueFacts: Clock,
  osm: Map,
} as const;

export type DataSourceListCopy = Record<keyof typeof DATA_SOURCE_ICONS, {
  name: string;
  desc: string;
}>;

export function DataSourceList({ copy }: { copy: DataSourceListCopy }) {
  const dataSources: DataSource[] = Object.entries(copy).map(([key, value]) => ({
    key,
    icon: DATA_SOURCE_ICONS[key as keyof typeof DATA_SOURCE_ICONS],
    name: value.name,
    desc: value.desc,
  }));

  return (
    <ul data-testid="about-data-sources" className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {dataSources.map(({ key, icon: Icon, name, desc }) => (
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
            <span className="text-label-lg text-text-primary">{name}</span>
            <span className="text-body-sm text-text-body">{desc}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
