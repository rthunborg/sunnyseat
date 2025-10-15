import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import './index.css';

// Lazy load all page components for better code splitting
const LoginPage = lazy(() => import('./components/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const TimelineDashboard = lazy(() => import('./pages/TimelineDashboard').then(m => ({ default: m.TimelineDashboard })));
const AccuracyDashboard = lazy(() => import('./pages/AccuracyDashboard').then(m => ({ default: m.AccuracyDashboard })));
const VenuePage = lazy(() => import('./pages/VenuePage').then(m => ({ default: m.VenuePage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timeline"
                element={
                  <ProtectedRoute>
                    <TimelineDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accuracy"
                element={
                  <ProtectedRoute>
                    <AccuracyDashboard />
                  </ProtectedRoute>
                }
              />
              {/* Public venue page route */}
              <Route path="/v/:slug" element={<VenuePage />} />
              {/* 404 page */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="/" element={<Navigate to="/admin" replace />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
