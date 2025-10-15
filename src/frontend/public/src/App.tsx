// App.tsx
import React, { lazy, Suspense } from 'react';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy load the HomePage for code splitting
const HomePage = lazy(() => import('./pages/HomePage/HomePage'));

const App: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomePage />
    </Suspense>
  );
};

export default App;
