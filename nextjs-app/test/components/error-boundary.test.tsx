import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GlobalError from '@/app/error';

describe('GlobalError boundary', () => {
  it('renders Swedish error message and retry button', () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error('test')} reset={reset} />);

    expect(screen.getByText('Något gick fel')).toBeDefined();
    expect(screen.getByText('Försök igen')).toBeDefined();
  });

  it('calls reset when retry button is clicked', () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error('test')} reset={reset} />);

    fireEvent.click(screen.getByText('Försök igen'));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('logs the error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reset = vi.fn();
    const err = new Error('something broke');
    render(<GlobalError error={err} reset={reset} />);

    expect(consoleSpy).toHaveBeenCalledWith('[GlobalError]', err);
    consoleSpy.mockRestore();
  });
});
