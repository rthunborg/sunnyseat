import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize Application Insights (if configured)
import './utils/appInsights';

// Report Web Vitals (if configured)
import { reportWebVitals } from './utils/webVitals';

// Error boundary for top-level error handling
import { ErrorBoundary } from './components/common/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)

// Start tracking Web Vitals after app is rendered
reportWebVitals();
