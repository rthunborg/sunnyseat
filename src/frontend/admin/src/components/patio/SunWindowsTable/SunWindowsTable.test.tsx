import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SunWindowsTable } from './SunWindowsTable';
import type { SunWindow } from '../../../types';

describe('SunWindowsTable', () => {
  const mockSunWindows: SunWindow[] = [
    {
      id: 1,
      patioId: 1,
      date: '2025-10-08',
      startTime: '2025-10-08T08:00:00Z',
      endTime: '2025-10-08T10:00:00Z',
      localStartTime: '2025-10-08T10:00:00',
      localEndTime: '2025-10-08T12:00:00',
      duration: '02:00:00',
      peakExposure: 85,
      minExposurePercent: 70,
      maxExposurePercent: 95,
      averageExposurePercent: 85,
      peakExposureTime: '2025-10-08T09:00:00Z',
      localPeakExposureTime: '2025-10-08T11:00:00',
      quality: 'Good',
      confidence: 80,
      description: 'Good sun exposure',
      isRecommended: true,
      recommendationReason: 'High sun exposure',
      priorityScore: 90,
      dataPointCount: 12,
      calculatedAt: '2025-10-08T00:00:00Z',
    },
  ];

  it('should render sun windows', () => {
    render(<SunWindowsTable windows={mockSunWindows} date={new Date()} />);
    
    expect(screen.getByText(/80% confidence/i)).toBeTruthy();
  });

  it('should format time ranges correctly', () => {
    render(<SunWindowsTable windows={mockSunWindows} date={new Date()} />);
    
    // Check that time is formatted (will be in AM/PM format)
    const timeElements = screen.getAllByText(/AM|PM/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('should display duration', () => {
    render(<SunWindowsTable windows={mockSunWindows} date={new Date()} />);
    
    // Duration should be displayed
    expect(screen.getByText(/2h 0m/)).toBeTruthy();
  });

  it('should handle empty windows array', () => {
    render(<SunWindowsTable windows={[]} date={new Date()} />);
    
    // Should render without crashing
    expect(document.body).toBeTruthy();
  });
});

