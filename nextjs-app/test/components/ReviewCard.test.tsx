import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReviewCard } from '@/components/composed/feedback/ReviewCard';
import type { ReviewDto } from '@/lib/types/api';

const labels = {
  rating: 'Rating {rating} out of 5',
  noRating: 'No rating',
  photoAttached: 'Photo attached',
};

const REVIEW: ReviewDto = {
  id: 'review_1',
  venueId: '1',
  venueSlug: 'test-venue-sunny',
  text: 'Great afternoon sun.',
  rating: 4,
  createdAt: '2026-06-07T12:00:00.000Z',
};

describe('ReviewCard', () => {
  it('renders text, optional rating, relative timestamp, and token classes', () => {
    render(
      <ReviewCard
        review={REVIEW}
        labels={labels}
        locale="en"
        now={new Date('2026-06-08T12:00:00.000Z')}
      />,
    );

    expect(screen.getByText('Great afternoon sun.')).toHaveClass('text-body-sm');
    expect(screen.getByText('Great afternoon sun.')).toHaveClass('break-words');
    expect(screen.getByRole('img', { name: 'Rating 4 out of 5' })).toBeInTheDocument();
    expect(screen.getByText('yesterday')).toHaveAttribute('dateTime', REVIEW.createdAt);
    expect(screen.getByText('Great afternoon sun.').closest('article')).toHaveClass(
      'rounded-card',
      'border-divider',
      'shadow-subtle',
    );
  });

  it('renders no-rating and photo-attached states without color-only information', () => {
    render(
      <ReviewCard
        review={{
          ...REVIEW,
          rating: undefined,
          photo: { name: 'ute.jpg', type: 'image/jpeg', size: 1000 },
        }}
        labels={labels}
        locale="en"
        now={new Date('2026-06-08T12:00:00.000Z')}
      />,
    );

    expect(screen.getByText('No rating')).toBeInTheDocument();
    expect(screen.getByText('Photo attached')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Rating/ })).toBeNull();
  });
});
