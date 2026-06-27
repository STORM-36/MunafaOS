import React, { useEffect, Suspense, lazy } from 'react';
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
import { useAuth } from '../features/auth/context/AuthContext';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';

// Lazy load components
const Settings = lazy(() => import('../features/settings/pages/Settings'));
const AnalyticsPage = lazy(() => import('../features/analytics/pages/AnalyticsPage'));
import { validateThirdPartyLibraries } from '../utils/validateLibraries';

const LoadingComponent = () => (
  <div className="flex items-center justify-center p-10">
    <p className="text-gray-500">⏳ Loading...</p>
  </div>
);

function App() {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    validateThirdPartyLibraries();
  }, []);

  if (loading) {
    return <LoadingComponent />;
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
            <Suspense fallback={<LoadingComponent />}>
              <AnalyticsPage />
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
              <Suspense fallback={<LoadingComponent />}>
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
