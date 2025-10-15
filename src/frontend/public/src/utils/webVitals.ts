// utils/webVitals.ts
// Core Web Vitals tracking for performance monitoring

import type { Metric } from 'web-vitals';

/**
 * Report Web Vitals metrics to console (development) or analytics (production)
 */
const reportWebVitals = (metric: Metric): void => {
  const { name, value, rating, delta } = metric;

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(value),
      rating,
      delta: Math.round(delta),
    });
  }

  // In production, send to analytics service
  // Example: sendToAnalytics(metric);
  
  // Track thresholds
  const thresholds = {
    FCP: 1800,  // First Contentful Paint < 1.8s (Story requirement: <1.5s)
    LCP: 2500,  // Largest Contentful Paint < 2.5s (Story requirement: <2.5s)
    CLS: 0.1,   // Cumulative Layout Shift < 0.1
    TTFB: 800,  // Time to First Byte < 800ms
    INP: 200,   // Interaction to Next Paint < 200ms (replaces FID)
  };

  const threshold = thresholds[name as keyof typeof thresholds];
  if (threshold && value > threshold) {
    console.warn(`[Performance Warning] ${name} exceeded threshold:`, {
      value: Math.round(value),
      threshold,
      rating,
    });
  }
};

/**
 * Initialize Core Web Vitals tracking
 */
export const initWebVitals = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    try {
      const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');
      
      onCLS(reportWebVitals);
      onFCP(reportWebVitals);
      onLCP(reportWebVitals);
      onTTFB(reportWebVitals);
      onINP(reportWebVitals); // INP replaces FID
    } catch (error) {
      console.error('[Web Vitals] Failed to initialize:', error);
    }
  }
};

/**
 * Custom performance mark for specific operations
 */
export const markPerformance = (name: string): void => {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
};

/**
 * Measure time between two performance marks
 */
export const measurePerformance = (name: string, startMark: string, endMark: string): number | null => {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      const measure = performance.measure(name, startMark, endMark);
      return measure.duration;
    } catch (error) {
      console.error(`[Performance] Failed to measure ${name}:`, error);
      return null;
    }
  }
  return null;
};

export default reportWebVitals;
