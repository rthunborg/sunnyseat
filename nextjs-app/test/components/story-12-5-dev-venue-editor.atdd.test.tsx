/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.5
 * Accessible local editor interactions and gate-off public UI preservation.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, test, vi } from 'vitest';

type DevVenueEditorProps = {
  enabled: boolean;
  includeHidden?: boolean;
  onSave?: (payload: unknown) => Promise<void>;
};

type PlannedDevVenueEditorModule = {
  DevVenueEditor: (props: DevVenueEditorProps) => ReactElement | null;
};

async function loadPlannedDevVenueEditor(): Promise<PlannedDevVenueEditorModule> {
  throw new Error('RED: implement the dev-only venue editor component and import it here.');
}

describe.skip('Story 12.5 ATDD - dev venue editor UI', () => {
  test('[P0] gate-off map and detail surfaces render without editor chrome or editor test ids', async () => {
    const { DevVenueEditor } = await loadPlannedDevVenueEditor();

    render(<DevVenueEditor enabled={false} />);

    expect(screen.queryByTestId('dev-venue-editor-panel')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /spara|save/i })).not.toBeInTheDocument();
  });

  test('[P1] dev guard exposes complete Swedish-labeled controls with 44px touch targets', async () => {
    const { DevVenueEditor } = await loadPlannedDevVenueEditor();

    render(<DevVenueEditor enabled includeHidden />);
    const panel = screen.getByTestId('dev-venue-editor-panel');

    expect(within(panel).getByRole('combobox', { name: /plats|venue/i })).toBeVisible();
    expect(within(panel).getByRole('button', { name: /spara/i })).toHaveStyle({
      minHeight: '44px',
      minWidth: '44px',
    });
    expect(within(panel).getByLabelText(/visa dolda/i)).toBeVisible();
    expect(within(panel).getByLabelText(/position/i)).toBeVisible();
    expect(within(panel).getByLabelText(/polygon/i)).toBeVisible();
    expect(within(panel).getByLabelText(/taggar/i)).toBeVisible();
    expect(within(panel).getByLabelText(/beskrivning/i)).toBeVisible();
    expect(within(panel).getByLabelText(/miniatyrbild/i)).toBeVisible();
  });

  test('[P1] keyboard users can edit display coordinates without pointer drag', async () => {
    const { DevVenueEditor } = await loadPlannedDevVenueEditor();
    const onSave = vi.fn(async () => undefined);

    render(<DevVenueEditor enabled onSave={onSave} />);

    const positionControl = screen.getByLabelText(/position/i);
    positionControl.focus();
    fireEvent.keyDown(positionControl, { key: 'ArrowUp' });
    fireEvent.keyDown(positionControl, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: /spara/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      displayLocation: expect.objectContaining({
        lat: expect.any(Number),
        lng: expect.any(Number),
      }),
    }));
  });

  test('[P1] invalid polygon and media input show inline errors and keep destructive actions disabled', async () => {
    const { DevVenueEditor } = await loadPlannedDevVenueEditor();

    render(<DevVenueEditor enabled />);
    fireEvent.change(screen.getByLabelText(/polygon/i), {
      target: { value: '[[11.97,57.70],[11.98,57.70]]' },
    });
    fireEvent.change(screen.getByLabelText(/miniatyrbild/i), {
      target: { value: 'https://example.com/photo.jpg' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/polygon|media|supabase/i);
    expect(screen.getByRole('button', { name: /spara/i })).toBeDisabled();
  });

  test('[P1] successful save exposes busy state, focus recovery, and local query invalidation feedback', async () => {
    const { DevVenueEditor } = await loadPlannedDevVenueEditor();
    const onSave = vi.fn(async () => undefined);

    render(<DevVenueEditor enabled onSave={onSave} />);
    const save = screen.getByRole('button', { name: /spara/i });

    fireEvent.click(save);

    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByRole('status')).toHaveTextContent(/sparad|uppdaterad/i);
    expect(save).toHaveFocus();
  });
});
