import React, { useEffect, Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import Unauthorized from './components/Unauthorized';
import Dashboard from './pages/Dashboard';
import AddInventory from './pages/AddInventory';
import InventoryListPage from './pages/InventoryListPage';
import OrdersPage from './pages/OrdersPage';
import TeamManagement from './pages/TeamManagement';
import OCRScanner from './pages/OCRScanner';
import BulkImport from './pages/BulkImport';
import AppLayout from './layouts/AppLayout';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load components
const Settings = lazy(() => import('./components/Settings'));
import { validateThirdPartyLibraries } from './utils/validateLibraries'; 

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