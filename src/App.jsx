import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { pageVariants } from './motion/variants';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { ToastProvider, useToast } from './components/Toast';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Warehouses from './pages/Warehouses';
import AddWarehouse from './pages/warehouse/AddWarehouse';
import EditWarehouse from './pages/warehouse/EditWarehouse';
import ViewWarehouse from './pages/warehouse/ViewWarehouse';
import RackManagement from './pages/warehouse/RackManagement';
import BinManagement from './pages/warehouse/BinManagement';
import WarehouseInventory from './pages/warehouse/WarehouseInventory';
import StockMovement from './pages/StockMovement';
import Suppliers from './pages/Suppliers';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Users from './pages/Users';

/* Inner layout that uses auth + inventory context */
function AppLayout() {
  const { setToastFn, error, loading, loadAll } = useInventory();
  const { showToast } = useToast();
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const location = useLocation();

  // every new page starts at the top
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);

  // Wire up toast callback so InventoryContext can trigger toasts
  useEffect(() => {
    setToastFn((type, message) => showToast(type, message));
  }, [setToastFn, showToast]);

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileSidebar} onClose={() => setMobileSidebar(false)} />
      <div className="app-main">
        <Topbar onMenuClick={() => setMobileSidebar(true)} />
        <main className="app-content">
          {error && !loading && (
            <div className="card" role="alert" style={{ borderLeft: '4px solid var(--danger, #dc2626)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>{error}</span>
              <button className="btn btn-primary btn-sm" onClick={loadAll}>Retry</button>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} className="page-motion" variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <Routes location={location}>
            <Route path="/login"          element={<ProtectedRoute route="login"><Login /></ProtectedRoute>} />
            <Route path="/dashboard"      element={<ProtectedRoute route="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/inventory"      element={<ProtectedRoute route="inventory"><Products /></ProtectedRoute>} />
            <Route path="/warehouses"     element={<ProtectedRoute route="warehouses"><Warehouses /></ProtectedRoute>} />
            <Route path="/warehouses/add"  element={<ProtectedRoute route="warehouses"><AddWarehouse /></ProtectedRoute>} />
            <Route path="/warehouses/edit/:id" element={<ProtectedRoute route="warehouses"><EditWarehouse /></ProtectedRoute>} />
            <Route path="/warehouses/view/:id" element={<ProtectedRoute route="warehouses"><ViewWarehouse /></ProtectedRoute>} />
            <Route path="/warehouses/:id/racks" element={<ProtectedRoute route="warehouses"><RackManagement /></ProtectedRoute>} />
            <Route path="/warehouses/:warehouseId/racks/:rackId/bins" element={<ProtectedRoute route="warehouses"><BinManagement /></ProtectedRoute>} />
            <Route path="/warehouses/:warehouseId/inventory" element={<ProtectedRoute route="warehouses"><WarehouseInventory /></ProtectedRoute>} />
            <Route path="/stock-movement" element={<ProtectedRoute route="stock-movement"><StockMovement /></ProtectedRoute>} />
            <Route path="/suppliers"      element={<ProtectedRoute route="suppliers"><Suppliers /></ProtectedRoute>} />
            <Route path="/orders"         element={<ProtectedRoute route="orders"><Orders /></ProtectedRoute>} />
            <Route path="/reports"        element={<ProtectedRoute route="reports"><Reports /></ProtectedRoute>} />
            <Route path="/users"          element={<ProtectedRoute route="users"><Users /></ProtectedRoute>} />
          </Routes>
          </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* Bridge: wire NotificationContext.addNotification into InventoryContext */
function NotificationBridge({ children }) {
  const { refresh } = useNotifications();
  const { setNotifyFn } = useInventory();

  // The server creates low-stock alerts itself — the bell only needs to re-load
  useEffect(() => {
    setNotifyFn(() => refresh());
  }, [setNotifyFn, refresh]);

  return children;
}

/* Root router: redirects / to /dashboard or /login */
function RootRouter() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (location.pathname === '/' || location.pathname === '') {
      navigate(user ? '/dashboard' : '/login', { replace: true });
    } else if (location.pathname === '/login' && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        user ? (
          <NotificationBridge>
            <AppLayout />
          </NotificationBridge>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <InventoryProvider>
            <RootRouter />
          </InventoryProvider>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
