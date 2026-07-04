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

  // --- Story 11.3 coverage expansion (automate): edge cases the existing
  // happy-path suite leaves open — the OR-union multi-active case, the unmapped
  // live-tag fallback ([NOTE] localizeTag drift), and the className/order plumbing. ---

  it('renders MULTIPLE active chips at once (the filter is an OR-union, not single-select)', () => {
    // filterVenuesByTags unions ≥1 active tag, so several chips can be "on"
    // simultaneously — each must independently reflect its pressed state.
    render(
      <MobileTagChips
        tags={['Innergård', 'Wifi', 'Hund ok']}
        isActive={(tag) => tag === 'Innergård' || tag === 'Hund ok'}
        onToggleTag={vi.fn()}
        locale="sv"
        label="Filter"
      />,
    );
    expect(screen.getByRole('button', { name: 'Innergård' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hund ok' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Wifi' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('falls back to the raw canonical (Swedish) value for an EN-unmapped live tag — never a blank/truncated label', () => {
    // A live tag not in the 16-entry TAG_DISPLAY_EN map (the [NOTE] drift risk).
    // localizeTag returns the canonical value verbatim, so the chip stays legible
    // in EN rather than rendering an empty or clipped label.
    render(
      <MobileTagChips
        tags={['Uteservering']}
        isActive={() => false}
        onToggleTag={vi.fn()}
        locale="en"
        label="Filter"
      />,
    );
    const chip = screen.getByRole('button', { name: 'Uteservering' });
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('Uteservering');
  });

  it('toggling an unmapped-in-EN chip still carries the CANONICAL value (matching never diverges by locale)', () => {
    const onToggleTag = vi.fn();
    render(
      <MobileTagChips
        tags={['Uteservering']}
        isActive={() => false}
        onToggleTag={onToggleTag}
        locale="en"
        label="Filter"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Uteservering' }));
    expect(onToggleTag).toHaveBeenCalledWith('Uteservering');
  });

  it('preserves the incoming tag ORDER left-to-right (first-seen union order is not re-sorted)', () => {
    render(
      <MobileTagChips
        tags={['Wifi', 'Innergård', 'Kanal', 'Hund ok']}
        isActive={() => false}
        onToggleTag={vi.fn()}
        locale="sv"
        label="Filter"
      />,
    );
    const labels = screen
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(labels).toEqual(['Wifi', 'Innergård', 'Kanal', 'Hund ok']);
  });

  it('applies the caller-supplied className alongside the base row classes (does not clobber the axis guard)', () => {
    render(
      <MobileTagChips
        tags={['Innergård']}
        isActive={() => false}
        onToggleTag={vi.fn()}
        locale="sv"
        label="Filter"
        className="mt-2"
      />,
    );
    const row = screen.getByTestId('mobile-tag-chips');
    expect(row.className).toContain('mt-2');
    // The base overflow-x-auto (the horizontal scroller / axis guard) survives the merge.
    expect(row.className).toContain('overflow-x-auto');
  });

  it('uses the supplied group label as the accessible name of the chip-row nav', () => {
    render(
      <MobileTagChips
        tags={['Innergård']}
        isActive={() => false}
        onToggleTag={vi.fn()}
        locale="sv"
        label="Filtrera platser"
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Filtrera platser' })).toBeInTheDocument();
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
