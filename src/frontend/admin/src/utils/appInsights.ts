import { ApplicationInsights } from '@microsoft/applicationinsights-web';

// Initialize Application Insights
// Connection string should be in environment variable
export const appInsights = new ApplicationInsights({
  config: {
    connectionString: import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING || '',
    enableAutoRouteTracking: true, // Track route changes
    disableFetchTracking: false,
    enableCorsCorrelation: true,
    enableRequestHeaderTracking: true,
    enableResponseHeaderTracking: true,
  },
});

// Only initialize if connection string is provided
if (import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.loadAppInsights();
  appInsights.trackPageView(); // Track initial page view
}
