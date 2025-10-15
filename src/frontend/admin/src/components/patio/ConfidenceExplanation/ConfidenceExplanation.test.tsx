import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfidenceExplanation } from './ConfidenceExplanation';

describe('ConfidenceExplanation', () => {
  it('should display confidence percentage', () => {
    render(
      <ConfidenceExplanation
        confidence={85}
        quality="Good"
        description="Test description"
      />
    );

    fireEvent.click(screen.getByText(/show confidence details/i));
    expect(screen.getByText(/85%/)).toBeTruthy();
  });

  it('should expand when clicked', () => {
    render(
      <ConfidenceExplanation
        confidence={85}
        quality="Excellent"
        description="Test description"
      />
    );

    const button = screen.getByText(/show confidence details/i);
    fireEvent.click(button);

    expect(screen.getByText(/Excellent Quality/i)).toBeTruthy();
  });

  it('should show quality indicator', () => {
    render(
      <ConfidenceExplanation
        confidence={95}
        quality="Excellent"
      />
    );

    fireEvent.click(screen.getByText(/show confidence details/i));
    expect(screen.getByText(/Excellent Quality/i)).toBeTruthy();
  });

  it('should display description when provided', () => {
    const description = 'Test weather description';
    render(
      <ConfidenceExplanation
        confidence={75}
        quality="Fair"
        description={description}
      />
    );

    fireEvent.click(screen.getByText(/show confidence details/i));
    expect(screen.getByText(description)).toBeTruthy();
  });
});

