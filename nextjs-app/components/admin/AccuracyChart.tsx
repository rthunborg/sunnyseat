'use client';

interface AccuracyDataPoint {
  date: string;
  value: number;
  count: number;
}

interface AccuracyChartProps {
  data: AccuracyDataPoint[];
}

function getBarColor(value: number): string {
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function AccuracyChart({ data }: AccuracyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
        Ingen data att visa
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Daglig precision (senaste 14 dagarna)
      </h3>
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 flex h-48 flex-col justify-between text-[10px] text-muted-foreground">
          <span>100%</span>
          <span>80%</span>
          <span>60%</span>
          <span>40%</span>
          <span>20%</span>
          <span>0%</span>
        </div>
        {/* Chart area */}
        <div className="ml-10">
          {/* 80% threshold line */}
          <div className="relative h-48">
            <div
              className="absolute left-0 right-0 border-t border-dashed border-amber-400/50"
              style={{ top: '20%' }}
              aria-hidden="true"
            />
            {/* Bars */}
            <div className="flex h-full items-end gap-1">
              {data.map((point) => (
                <div
                  key={point.date}
                  className="group relative flex flex-1 flex-col items-center"
                  style={{ height: '100%' }}
                >
                  <div
                    className="flex w-full flex-col items-center justify-end"
                    style={{ height: '100%' }}
                  >
                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute -top-8 z-10 hidden rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md group-hover:block">
                      {point.value.toFixed(1)}% ({point.count} st)
                    </div>
                    <div
                      className={`w-full min-w-[8px] max-w-[32px] rounded-t ${getBarColor(point.value)} transition-opacity hover:opacity-80`}
                      style={{ height: `${Math.max(point.value, 2)}%` }}
                      role="img"
                      aria-label={`${formatDate(point.date)}: ${point.value.toFixed(1)}% precision, ${point.count} feedback`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* X-axis labels */}
          <div className="mt-1 flex gap-1">
            {data.map((point) => (
              <div
                key={point.date}
                className="flex-1 text-center text-[9px] text-muted-foreground"
              >
                {formatDate(point.date)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
