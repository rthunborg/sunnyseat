import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MobileTagChips } from '@/components/composed/venue/MobileTagChips';

describe('<MobileTagChips /> — Story 11.3 AC1 (mobile tag-chip row)', () => {
  it('renders nothing until at least one tag loads (no placeholder flash)', () => {
    const { container } = render(
      <MobileTagChips
        tags={[]}
        isActive={() => false}
        onToggleTag={vi.fn()}
        locale="sv"
        label="Filter"
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('mobile-tag-chips')).toBeNull();
  });

  it('renders the data-driven chip set in first-seen order from the tag union', () => {
    render(
      <MobileTagChips
        tags={['Innergård', 'Hund ok', 'Wifi']}
        isActive={() => false}
        onToggleTag={vi.fn()}
        locale="sv"
        label="Filter"
      />,
    );
    expect(screen.getByRole('button', { name: 'Innergård' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hund ok' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wifi' })).toBeInTheDocument();
    // A tag no venue carries is never in `tags`, so no fabricated chip renders.
    expect(screen.queryByRole('button', { name: 'Takterrass' })).toBeNull();
  });

  it('localizes the chip DISPLAY label for `en` while matching stays canonical', () => {
    render(
      <MobileTagChips
        tags={['Innergård', 'Wifi']}
        isActive={() => false}
        onToggleTag={vi.fn()}
        locale="en"
        label="Filter"
      />,
    );
    // English display labels (Courtyard / Wi-Fi) from the shared `localizeTag` map.
    expect(screen.getByRole('button', { name: 'Courtyard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wi-Fi' })).toBeInTheDocument();
  });

  it('toggling a chip calls onToggleTag with the CANONICAL (Swedish) value', () => {
    const onToggleTag = vi.fn();
    render(
      <MobileTagChips
        tags={['Innergård']}
        isActive={() => false}
        onToggleTag={onToggleTag}
        locale="en"
        label="Filter"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Courtyard' }));
    // Even though the label is localized, the toggle carries the canonical value.
    expect(onToggleTag).toHaveBeenCalledWith('Innergård');
  });

  it('an active chip carries the reference "on" pill classes + aria-pressed=true', () => {
    render(
      <MobileTagChips
        tags={['Innergård', 'Wifi']}
        isActive={(tag) => tag === 'Innergård'}
        onToggleTag={vi.fn()}
        locale="sv"
        label="Filter"
      />,
    );
    const active = screen.getByRole('button', { name: 'Innergård' });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    // Reference "on" pill: dark #1b1b1e (bg-text-primary) + white label — mirrors
    // the desktop chip so both breakpoints read identically.
    expect(active.className).toContain('bg-text-primary');
    expect(active.className).toContain('text-white');

    const inactive = screen.getByRole('button', { name: 'Wifi' });
    expect(inactive).toHaveAttribute('aria-pressed', 'false');
    expect(inactive.className).toContain('bg-white');
    expect(inactive.className).toContain('text-text-body');
  });

  it('each chip is a keyboard-focusable button meeting the 44px touch target', () => {
    render(
      <MobileTagChips
        tags={['Innergård']}
        isActive={() => false}
        onToggleTag={vi.fn()}
        locale="sv"
        label="Filter"
      />,
    );
    const chip = screen.getByRole('button', { name: 'Innergård' });
    expect(chip).toHaveAttribute('type', 'button');
    expect(chip).toBeEnabled();
    // 44px min touch target (a11y AA), shared with the mobile sort toggles.
    expect(chip.className).toContain('min-h-11');
  });

  it('claims the horizontal axis (touch-action pan-x) so a chip fling never hijacks the vertical sheet drag (AC3 axis guard)', () => {
    render(
      <MobileTagChips
        tags={['Innergård']}
        isActive={() => false}
        onToggleTag={vi.fn()}
        locale="sv"
        label="Filter"
      />,
    );
    const row = screen.getByTestId('mobile-tag-chips');
    expect(row).toHaveStyle({ touchAction: 'pan-x' });
    // Horizontal scroller.
    expect(row.className).toContain('overflow-x-auto');
  });

  it('reflects live toggle state end-to-end (integration over local state)', () => {
    function Harness() {
      const [active, setActive] = useState<Set<string>>(new Set());
      return (
        <MobileTagChips
          tags={['Innergård', 'Wifi']}
          isActive={(tag) => active.has(tag)}
          onToggleTag={(tag) =>
            setActive((prev) => {
              const next = new Set(prev);
              if (next.has(tag)) next.delete(tag);
              else next.add(tag);
              return next;
            })
          }
          locale="sv"
          label="Filter"
        />
      );
    }
    render(<Harness />);
    const chip = screen.getByRole('button', { name: 'Innergård' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(chip);
    expect(screen.getByRole('button', { name: 'Innergård' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Innergård' }));
    expect(screen.getByRole('button', { name: 'Innergård' })).toHaveAttribute('aria-pressed', 'false');
  });
});
