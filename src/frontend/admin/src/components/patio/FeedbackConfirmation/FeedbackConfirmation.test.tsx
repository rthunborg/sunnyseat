import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackConfirmation } from './FeedbackConfirmation';

describe('FeedbackConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display confirmation message when shown', () => {
    const onClose = vi.fn();

    render(<FeedbackConfirmation show={true} onClose={onClose} />);

    expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    expect(
      screen.getByText(/your feedback helps improve sun predictions/i)
    ).toBeInTheDocument();
  });

  it('should not render when show is false', () => {
    const onClose = vi.fn();
    const { container } = render(<FeedbackConfirmation show={false} onClose={onClose} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should display undo button with countdown', () => {
    const onClose = vi.fn();
    const onUndo = vi.fn();

    render(<FeedbackConfirmation show={true} onClose={onClose} onUndo={onUndo} />);

    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByText(/5s/i)).toBeInTheDocument();
  });

  it('should call onUndo when undo button is clicked', () => {
    const onClose = vi.fn();
    const onUndo = vi.fn();

    render(<FeedbackConfirmation show={true} onClose={onClose} onUndo={onUndo} />);

    const undoButton = screen.getByRole('button', { name: /undo/i });
    fireEvent.click(undoButton);

    expect(onUndo).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();

    render(<FeedbackConfirmation show={true} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close confirmation/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should auto-dismiss after timeout', async () => {
    const onClose = vi.fn();

    render(<FeedbackConfirmation show={true} onClose={onClose} undoTimeoutMs={1000} />);

    expect(onClose).not.toHaveBeenCalled();

    // Wait for the timeout to complete
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should countdown undo timer correctly', async () => {
    const onClose = vi.fn();
    const onUndo = vi.fn();

    render(
      <FeedbackConfirmation
        show={true}
        onClose={onClose}
        onUndo={onUndo}
        undoTimeoutMs={3000}
      />
    );

    // Initially shows 3 seconds
    expect(screen.getByText(/3s/i)).toBeInTheDocument();

    // Wait for countdown to 2 seconds
    await waitFor(() => {
      expect(screen.getByText(/2s/i)).toBeInTheDocument();
    }, { timeout: 1500 });

    // Wait for countdown to 1 second
    await waitFor(() => {
      expect(screen.getByText(/1s/i)).toBeInTheDocument();
    }, { timeout: 1500 });
  });

  it('should have proper ARIA attributes', () => {
    const onClose = vi.fn();

    render(<FeedbackConfirmation show={true} onClose={onClose} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });

  it('should not show undo button when onUndo is not provided', () => {
    const onClose = vi.fn();

    render(<FeedbackConfirmation show={true} onClose={onClose} />);

    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
  });
});
