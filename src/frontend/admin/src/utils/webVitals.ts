import { getCLS, getFID, getLCP } from 'web-vitals';
import type { Metric } from 'web-vitals';
import { appInsights } from './appInsights';

/**
 * Report Core Web Vitals to Application Insights
 * Tracks LCP (Largest Contentful Paint), FID (First Input Delay), and CLS (Cumulative Layout Shift)
 */
export function reportWebVitals() {
  // Only track if Application Insights is configured
  if (!import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING) {
    return;
  }

  const sendToAppInsights = (metric: Metric) => {
    appInsights.trackMetric({
      name: metric.name,
      average: metric.value,
      properties: {
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      },
    });
  };

  getCLS(sendToAppInsights);
  getFID(sendToAppInsights);
  getLCP(sendToAppInsights);
}

/**
 * Track custom performance marks for key interactions
 */
export function markPerformance(name: string) {
  if (performance && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string) {
  if (performance && performance.measure) {
    try {
      const measure = performance.measure(name, startMark, endMark);
      
      // Track to Application Insights if configured
      if (import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING) {
        appInsights.trackMetric({
          name: `Performance: ${name}`,
          average: measure.duration,
        });
      }
    } catch (error) {
      // Marks may not exist, ignore
      console.debug('Performance measurement failed:', error);
    }
  }
}
