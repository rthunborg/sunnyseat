// FeedbackButton Component Tests

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackButton } from './FeedbackButton';

describe('FeedbackButton', () => {
  const defaultProps = {
    venueId: 1,
    patioId: 1,
    predictedSunExposure: 85,
    predictedConfidence: 75,
  };

  it('should render Yes/No buttons correctly', () => {
    render(<FeedbackButton {...defaultProps} showPrompt={true} />);

    expect(screen.getByRole('button', { name: /yes, it was sunny/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /no, it was not sunny/i })).toBeInTheDocument();
  });

  it('should display privacy note', () => {
    render(<FeedbackButton {...defaultProps} showPrompt={true} />);

    expect(
      screen.getByText(/your feedback is anonymous/i)
    ).toBeInTheDocument();
  });

  it('should submit feedback when user clicks Yes', async () => {
    const onSubmit = vi.fn();

    render(
      <FeedbackButton
        {...defaultProps}
        onSubmit={onSubmit}
        showPrompt={true}
      />
    );

    const yesButton = screen.getByRole('button', { name: /yes, it was sunny/i });
    fireEvent.click(yesButton);

    expect(onSubmit).toHaveBeenCalledWith(true);
  });

  it('should submit feedback when user clicks No', async () => {
    const onSubmit = vi.fn();

    render(
      <FeedbackButton
        {...defaultProps}
        onSubmit={onSubmit}
        showPrompt={true}
      />
    );

    const noButton = screen.getByRole('button', { name: /no, it was not sunny/i });
    fireEvent.click(noButton);

    expect(onSubmit).toHaveBeenCalledWith(false);
  });

  it('should apply active styling to selected button', () => {
    render(<FeedbackButton {...defaultProps} showPrompt={true} />);

    const yesButton = screen.getByRole('button', { name: /yes, it was sunny/i });
    fireEvent.click(yesButton);

    expect(yesButton).toHaveClass('feedback-button-active');
  });

  it('should disable buttons when submitting', () => {
    render(<FeedbackButton {...defaultProps} showPrompt={true} isSubmitting={true} />);

    const yesButton = screen.getByRole('button', { name: /yes, it was sunny/i });
    const noButton = screen.getByRole('button', { name: /no, it was not sunny/i });

    expect(yesButton).toBeDisabled();
    expect(noButton).toBeDisabled();
  });

  it('should show loading state when submitting', () => {
    render(<FeedbackButton {...defaultProps} showPrompt={true} isSubmitting={true} />);

    expect(screen.getByText(/submitting feedback/i)).toBeInTheDocument();
  });

  it('should not render when showPrompt is false', () => {
    const { container } = render(<FeedbackButton {...defaultProps} showPrompt={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should have proper accessibility labels', () => {
    render(<FeedbackButton {...defaultProps} showPrompt={true} />);

    expect(screen.getByRole('region', { name: /feedback prompt/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /feedback options/i })).toBeInTheDocument();
  });
});
