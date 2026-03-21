import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SunWindowsTable } from '@/components/custom/SunWindowsTable';
import { LanguageProvider } from '@/lib/i18n';
import type { SunWindow } from '@/lib/types/venue';

function makeWindow(
  startMinuteStockholm: number,
  endMinuteStockholm: number,
  sunStatus: 'sunny' | 'partial' | 'shaded' = 'sunny',
  skyCondition: 'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'unavailable' = 'clear'
): SunWindow {
  const startH = Math.floor(startMinuteStockholm / 60);
  const startM = startMinuteStockholm % 60;
  const endH = Math.floor(endMinuteStockholm / 60);
  const endM = endMinuteStockholm % 60;
  const start = new Date(Date.UTC(2026, 0, 15, startH - 1, startM));
  const end = new Date(Date.UTC(2026, 0, 15, endH - 1, endM));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    sun_status: sunStatus,
    sky_condition: skyCondition,
  };
}

function renderTable(
  props: Partial<React.ComponentProps<typeof SunWindowsTable>> = {}
) {
  const defaultProps = {
    todayWindows: [] as SunWindow[],
    tomorrowWindows: [] as SunWindow[],
    now: new Date(Date.UTC(2026, 0, 15, 13, 0)), // 14:00 Stockholm
    ...props,
  };
  return render(
    <LanguageProvider>
      <SunWindowsTable {...defaultProps} />
    </LanguageProvider>
  );
}

describe('SunWindowsTable', () => {
  it('renders today and tomorrow sections with headers', () => {
    renderTable({
      todayWindows: [makeWindow(600, 720)],
      tomorrowWindows: [makeWindow(600, 720)],
    });
    expect(screen.getByText('Idag')).toBeTruthy();
    expect(screen.getByText('Imorgon')).toBeTruthy();
  });

  it('rows show time range and duration', () => {
    renderTable({
      todayWindows: [makeWindow(600, 745)], // 10:00–12:25
    });
    // Time range
    expect(screen.getByText('10:00 – 12:25')).toBeTruthy();
    // Duration
    expect(screen.getByText('2h 25m')).toBeTruthy();
  });

  it('active row has aria-current="true" and sunny-bg background', () => {
    const { container } = renderTable({
      todayWindows: [makeWindow(780, 960)], // 13:00–16:00
      now: new Date(Date.UTC(2026, 0, 15, 13, 30)), // 14:30 Stockholm — inside window
    });
    const activeRow = container.querySelector('[aria-current="true"]');
    expect(activeRow).toBeTruthy();
    expect(activeRow?.className).toContain('bg-sun-sunny-bg');
  });

  it('no-sun state shows "Ingen direkt sol" message with reason badge', () => {
    renderTable({
      todayWindows: [],
      tomorrowWindows: [makeWindow(600, 720)],
      noSunReason: 'shadow',
    });
    expect(screen.getByText('Ingen direkt sol förväntad')).toBeTruthy();
    expect(screen.getByText('Skugga')).toBeTruthy();
  });

  it('no sun both days shows combined message', () => {
    renderTable({
      todayWindows: [],
      tomorrowWindows: [],
      noSunReason: 'overcast',
    });
    expect(screen.getByText('Ingen direkt sol förväntad idag eller imorgon')).toBeTruthy();
    expect(screen.getByText('Mulet')).toBeTruthy();
  });

  it('tomorrow rows have "Prognos:" prefix', () => {
    renderTable({
      tomorrowWindows: [makeWindow(600, 720, 'sunny', 'clear')],
    });
    // "Prognos: Klart" should appear
    expect(screen.getByText('Prognos: Klart')).toBeTruthy();
  });

  it('table has semantic role="table" markup', () => {
    const { container } = renderTable({
      todayWindows: [makeWindow(600, 720)],
    });
    expect(container.querySelector('[role="table"]')).toBeTruthy();
    expect(container.querySelector('[role="rowgroup"]')).toBeTruthy();
    expect(container.querySelector('[role="row"]')).toBeTruthy();
  });

  it('overcast active window uses sun-partial-bg instead of sun-sunny-bg', () => {
    const { container } = renderTable({
      todayWindows: [makeWindow(780, 960, 'sunny', 'overcast')], // 13:00–16:00
      now: new Date(Date.UTC(2026, 0, 15, 13, 30)), // 14:30 Stockholm — inside window
    });
    const activeRow = container.querySelector('[aria-current="true"]');
    expect(activeRow).toBeTruthy();
    expect(activeRow?.className).toContain('bg-sun-partial-bg');
    expect(activeRow?.className).not.toContain('bg-sun-sunny-bg');
  });
});
