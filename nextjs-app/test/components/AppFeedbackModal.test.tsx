import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/setup/test-utils';
import { AppFeedbackModal } from '@/components/custom/feedback/AppFeedbackModal';
import commonMessages from '@/messages/sv/common.json';

const messages = {
  common: commonMessages,
  map: {},
  onboarding: {},
  venue: {},
  feedback: {},
  about: {},
  favourites: {},
};

function renderModal() {
  const onClose = vi.fn();
  renderWithProviders(<AppFeedbackModal open onClose={onClose} reducedMotion />, { messages });
  return { onClose };
}

describe('<AppFeedbackModal />', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps submit disabled until a star is chosen', () => {
    renderModal();
    expect(screen.getByTestId('app-feedback-submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('app-feedback-star-3'));
    expect(screen.getByTestId('app-feedback-submit')).toBeEnabled();
  });

  it('submits the rating + comment and shows the success state', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'x', rating: 4, comment: 'Toppen!', createdAt: '2026-06-29T00:00:00.000Z' }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    renderModal();

    fireEvent.click(screen.getByTestId('app-feedback-star-4'));
    fireEvent.change(screen.getByTestId('app-feedback-comment'), { target: { value: 'Toppen!' } });
    fireEvent.click(screen.getByTestId('app-feedback-submit'));

    await screen.findByText('Tack!');
    expect(fetchMock).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({ method: 'POST' }));
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(requestInit.body as string)).toMatchObject({
      rating: 4,
      comment: 'Toppen!',
      locale: 'sv',
    });
  });

  it('surfaces an error when submission fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 503 }));
    renderModal();

    fireEvent.click(screen.getByTestId('app-feedback-star-2'));
    fireEvent.click(screen.getByTestId('app-feedback-submit'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Det gick inte att skicka feedbacken. Försök igen.');
  });
});
