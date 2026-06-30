import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthForm from '../features/auth/components/AuthForm';
import Unauthorized from '../features/auth/components/Unauthorized';
import Dashboard from '../features/dashboard/pages/Dashboard';
import AddInventory from '../features/inventory/pages/AddInventory';
import InventoryListPage from '../features/inventory/pages/InventoryListPage';
import OrdersPage from '../features/orders/pages/OrdersPage';
import TeamManagement from '../features/team/pages/TeamManagement';
import OCRScanner from '../features/inventory/pages/OCRScanner';
import BulkImport from '../features/inventory/pages/BulkImport';
import Notifications from '../features/notifications/pages/Notifications';
import AppLayout from '../layouts/AppLayout';
import LoadingScreen from '../shared/components/LoadingScreen';
import { useAuth } from '../features/auth/context/AuthContext';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';

// Lazy load components
const Settings = lazy(() => import('../features/settings/pages/Settings'));
const AnalyticsPage = lazy(() => import('../features/analytics/pages/AnalyticsPage'));
const AIAssistant = lazy(() => import('../features/ai/pages/AIAssistant'));
import { validateThirdPartyLibraries } from '../utils/validateLibraries';

function App() {
  const { currentUser, loading } = useAuth();
  const [phase, setPhase] = useState('loading');

  useEffect(() => {
    validateThirdPartyLibraries();
  }, []);

  useEffect(() => {
    if (!loading && phase === 'loading') {
      setPhase('launching');
      setTimeout(() => setPhase('ready'), 1400);
    }
  }, [loading, phase]);

  if (phase !== 'ready') {
    return <LoadingScreen launching={phase === 'launching'} />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <AuthForm />}
      />

      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['owner', 'operator']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/inventory-list" element={<InventoryListPage />} />
        <Route path="/add-inventory" element={<AddInventory />} />
        <Route path="/ocr-scanner" element={<OCRScanner />} />
        <Route path="/bulk-import" element={<BulkImport />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route
          path="/analytics"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <AnalyticsPage />
            </Suspense>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <AIAssistant />
            </Suspense>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <TeamManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['owner', 'operator']}>
              <Suspense fallback={<LoadingScreen />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
