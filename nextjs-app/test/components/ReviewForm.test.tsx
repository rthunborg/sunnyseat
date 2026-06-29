import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReviewForm } from '@/components/composed/feedback/ReviewForm';

const labels = {
  venueSubtitle: 'Plats inom SunnySeat',
  heading: 'Skriv ett omdöme',
  textLabel: 'Omdöme',
  experiencePrompt: 'Hur var din upplevelse på {name}?',
  textPlaceholder: 'Berätta hur uteserveringen var i solen...',
  ratingLabel: 'Betyg (valfritt)',
  ratingValue: '{rating} av 5',
  photo: 'Lägg till foto (valfritt)',
  photoSelected: 'Valt foto: {name}',
  photoRejected: 'Fotot kunde inte läggas till. Välj en bildfil under 5 MB.',
  submit: 'Skicka',
  submitting: 'Skickar',
  close: 'Stäng',
  success: 'Tack för ditt omdöme.',
  error: 'Kunde inte skicka. Försök igen.',
  retry: 'Försök igen',
};

describe('ReviewForm', () => {
  it('enables submit only when textarea text is present and keeps token focus classes', () => {
    const onSubmit = vi.fn();
    render(
      <ReviewForm
        venueName="Kafé Magasinet"
        labels={labels}
        onSubmit={onSubmit}
        onClose={() => undefined}
      />,
    );

    const textarea = screen.getByRole('textbox', { name: 'Omdöme' });
    expect(textarea).toHaveClass('bg-surface-muted', 'rounded-card', 'focus:border-amber-dark', 'duration-fast', 'resize-y');
    expect(textarea).not.toHaveClass('resize-none');
    expect(screen.getByText('Hur var din upplevelse på Kafé Magasinet?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skicka' })).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Mycket sol.' } });
    expect(screen.getByRole('button', { name: 'Skicka' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Skicka' }));
    expect(onSubmit).toHaveBeenCalledWith({ text: 'Mycket sol.' });
  });

  it('keeps rating optional and attaches native file metadata', () => {
    const onSubmit = vi.fn();
    render(
      <ReviewForm
        venueName="Kafé Magasinet"
        labels={labels}
        onSubmit={onSubmit}
        onClose={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '5 av 5' }));
    const file = new File(['image'], 'ute.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveClass('hidden');
    expect(input).toHaveAttribute('aria-hidden', 'true');
    expect(input).toHaveAttribute('tabindex', '-1');
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Omdöme' }), {
      target: { value: 'Sol hela eftermiddagen.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka' }));

    expect(screen.getByText('Valt foto: ute.jpg')).toHaveClass('break-words');
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Sol hela eftermiddagen.',
      rating: 5,
      photo: expect.objectContaining({
        name: 'ute.jpg',
        type: 'image/jpeg',
        size: file.size,
      }),
    }));
  });

  it('treats invalid selected photo metadata as optional and submits the text review without it', () => {
    const onSubmit = vi.fn();
    render(
      <ReviewForm
        venueName="Kafé Magasinet"
        labels={labels}
        onSubmit={onSubmit}
        onClose={() => undefined}
      />,
    );

    const oversized = new File(['x'.repeat(6 * 1024 * 1024)], 'huge.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [oversized] } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Omdöme' }), {
      target: { value: 'Texten ska fortfarande gå att skicka.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka' }));

    expect(screen.queryByText(/Valt foto:/)).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({
      text: 'Texten ska fortfarande gå att skicka.',
    });
  });

  it('announces the localized rejection in the status region when a refused photo is picked and clears photo state', () => {
    const onSubmit = vi.fn();
    render(
      <ReviewForm
        venueName="Kafé Magasinet"
        labels={labels}
        onSubmit={onSubmit}
        onClose={() => undefined}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const oversized = new File(['x'.repeat(6 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [oversized] } });

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Fotot kunde inte läggas till. Välj en bildfil under 5 MB.');
    expect(status).not.toHaveClass('sr-only');
    expect(screen.queryByText(/Valt foto:/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Omdöme' }), {
      target: { value: 'Sol hela eftermiddagen.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka' }));
    expect(onSubmit).toHaveBeenCalledWith({ text: 'Sol hela eftermiddagen.' });
  });

  it.each([
    ['non-image', new File(['x'], 'doc.pdf', { type: 'application/pdf' })],
    ['zero-byte', new File([], 'empty.jpg', { type: 'image/jpeg' })],
    ['over-long name', new File(['x'], `${'a'.repeat(121)}.jpg`, { type: 'image/jpeg' })],
  ])('announces the rejection for a %s photo', (_label, file) => {
    render(
      <ReviewForm
        venueName="Kafé Magasinet"
        labels={labels}
        onSubmit={vi.fn()}
        onClose={() => undefined}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Fotot kunde inte läggas till. Välj en bildfil under 5 MB.',
    );
    expect(screen.queryByText(/Valt foto:/)).not.toBeInTheDocument();
  });

  it('clears the rejection announcement once a valid photo is selected', () => {
    render(
      <ReviewForm
        venueName="Kafé Magasinet"
        labels={labels}
        onSubmit={vi.fn()}
        onClose={() => undefined}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'.repeat(6 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' })] },
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Fotot kunde inte läggas till. Välj en bildfil under 5 MB.',
    );

    fireEvent.change(input, {
      target: { files: [new File(['image'], 'ok.jpg', { type: 'image/jpeg' })] },
    });
    expect(screen.getByText('Valt foto: ok.jpg')).toBeInTheDocument();
    expect(
      screen.queryByText('Fotot kunde inte läggas till. Välj en bildfil under 5 MB.'),
    ).not.toBeInTheDocument();
  });

  it('disables inputs while submitting and shows the loading label', () => {
    render(
      <ReviewForm
        venueName="Kafé Magasinet"
        labels={labels}
        isSubmitting
        onSubmit={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Omdöme' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skickar' })).toHaveAttribute('aria-busy', 'true');
  });

  it('renders inline error retry and close actions', () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();
    render(
      <ReviewForm
        venueName="Kafé Magasinet"
        labels={labels}
        submitState="error"
        onSubmit={() => undefined}
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Omdöme' }), {
      target: { value: 'Försök igen.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    expect(onRetry).toHaveBeenCalledWith({ text: 'Försök igen.' });

    fireEvent.click(screen.getByRole('button', { name: 'Stäng' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('replaces the form with success confirmation and close action', () => {
    const onClose = vi.fn();
    render(
      <ReviewForm
        venueName="Kafé Magasinet"
        labels={labels}
        submitState="success"
        onSubmit={() => undefined}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Tack för ditt omdöme.');
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Stäng' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
