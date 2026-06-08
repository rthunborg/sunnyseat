import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FeedbackPrompt, type FeedbackPromptLabels } from '@/components/composed/feedback/FeedbackPrompt';

const LABELS: FeedbackPromptLabels = {
  title: 'Hjälp oss träffa rätt',
  venueAddressLabel: 'Adress',
  mapLink: 'Hitta hit',
  outdoorQuestion: 'Har det här stället uteservering?',
  sunnyQuestion: 'Var det soligt när du kom?',
  yes: 'Ja',
  no: 'Nej',
  later: 'Vet inte än',
  noteLabel: 'Kommentar',
  notePlaceholder: 'Om du vill ge oss feedback...',
  submit: 'Skicka',
  submitting: 'Skickar feedback',
  close: 'Stäng',
  success: 'Tack för din feedback.',
  error: 'Kunde inte skicka. Försök igen.',
  retry: 'Försök igen',
};

function renderPrompt(overrides: Partial<React.ComponentProps<typeof FeedbackPrompt>> = {}) {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(
    <FeedbackPrompt
      venueName="Kafé Magasinet"
      address="Tredje Långgatan 9"
      labels={LABELS}
      onSubmit={onSubmit}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onSubmit, onClose };
}

describe('FeedbackPrompt', () => {
  it('supports single-choice answers and enables submit after one answer', () => {
    renderPrompt();
    const submit = screen.getByRole('button', { name: 'Skicka' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Kommentar'), { target: { value: 'Bara kommentar' } });
    expect(submit).toBeDisabled();

    const outdoorYes = screen.getByRole('button', { name: 'Har det här stället uteservering? Ja' });
    const outdoorNo = screen.getByRole('button', { name: 'Har det här stället uteservering? Nej' });
    fireEvent.click(outdoorYes);

    expect(outdoorYes).toHaveAttribute('aria-pressed', 'true');
    expect(outdoorNo).toHaveAttribute('aria-pressed', 'false');
    expect(submit).toBeEnabled();
    expect(outdoorYes).toHaveClass('min-h-11');
  });

  it('matches the server note length contract in the textarea', () => {
    renderPrompt();
    expect(screen.getByLabelText('Kommentar')).toHaveAttribute('maxlength', '500');
  });

  it('treats the clock answer as a selected single-choice sun response', () => {
    const { onSubmit } = renderPrompt();
    const clock = screen.getByRole('button', { name: 'Var det soligt när du kom? Vet inte än' });
    const sunnyYes = screen.getByRole('button', { name: 'Var det soligt när du kom? Ja' });

    fireEvent.click(clock);
    expect(clock).toHaveAttribute('aria-pressed', 'true');
    expect(sunnyYes).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Skicka' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Skicka' }));
    expect(onSubmit).toHaveBeenCalledWith({
      sunAccuracy: 'unsure',
      wasSunny: undefined,
      outdoorSeatingConfirmed: undefined,
      note: undefined,
    });
  });

  it('submits selected answers and note, then keeps inputs disabled while loading', () => {
    renderPrompt({ isSubmitting: true });
    fireEvent.change(screen.getByLabelText('Kommentar'), { target: { value: 'Bra prognos' } });
    expect(screen.getByLabelText('Kommentar')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skickar feedback' })).toBeDisabled();

    cleanup();
    const { onSubmit } = renderPrompt();
    fireEvent.click(screen.getByRole('button', { name: 'Var det soligt när du kom? Nej' }));
    fireEvent.change(screen.getByLabelText('Kommentar'), { target: { value: 'Skuggigt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka' }));

    expect(onSubmit).toHaveBeenCalledWith({
      sunAccuracy: 'not_sunny',
      wasSunny: false,
      outdoorSeatingConfirmed: undefined,
      note: 'Skuggigt',
    });
  });

  it('shows success, failure retry, and close action', () => {
    const onRetry = vi.fn();
    renderPrompt({ submitState: 'success' });
    expect(screen.getByRole('status')).toHaveTextContent('Tack för din feedback.');

    cleanup();
    const { onClose } = renderPrompt({ submitState: 'error', onRetry });
    fireEvent.click(screen.getByRole('button', { name: 'Var det soligt när du kom? Ja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({
      sunAccuracy: 'sunny',
      wasSunny: true,
    }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Stäng' }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit and close controls while the prompt is exiting', () => {
    const { onSubmit, onClose } = renderPrompt({ isExiting: true });

    fireEvent.click(screen.getByRole('button', { name: 'Var det soligt när du kom? Ja' }));
    const submit = screen.getByRole('button', { name: 'Skicka' });
    const close = screen.getByRole('button', { name: 'Stäng' });

    expect(submit).toBeDisabled();
    expect(close).toBeDisabled();
    fireEvent.click(submit);
    fireEvent.click(close);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('retries with the current edited form values after a failure', () => {
    const onRetry = vi.fn();
    renderPrompt({ submitState: 'error', onRetry });

    fireEvent.click(screen.getByRole('button', { name: 'Var det soligt när du kom? Nej' }));
    fireEvent.change(screen.getByLabelText('Kommentar'), { target: { value: 'Ny text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));

    expect(onRetry).toHaveBeenCalledWith({
      sunAccuracy: 'not_sunny',
      wasSunny: false,
      outdoorSeatingConfirmed: undefined,
      note: 'Ny text',
    });
  });
});
