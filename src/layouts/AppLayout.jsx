import { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import MunafaLogo from '../components/MunafaLogo';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../features/auth/context/AuthContext';
import { db } from '../firebase';

const AppLayout = () => {
  const { currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = (() => {
    if (location.pathname.startsWith('/orders')) return 'Orders';
    if (location.pathname.startsWith('/inventory-list')) return 'Inventory List';
    if (location.pathname.startsWith('/add-inventory')) return 'Add Inventory';
    if (location.pathname.startsWith('/bulk-import')) return 'Bulk Import';
    if (location.pathname.startsWith('/ocr-scanner')) return 'OCR Scanner';
    if (location.pathname.startsWith('/settings')) return 'Settings';
    if (location.pathname.startsWith('/dashboard')) return 'Dashboard';
    return 'MunafaOS';
  })();

  useEffect(() => {
    if (!currentUser?.workspaceId) {
      setOrderCount(0);
      setInventoryCount(0);
      return;
    }

    const ordersQuery = query(
      collection(db, 'orders'),
      where('workspaceId', '==', currentUser.workspaceId)
    );
    const inventoryQuery = query(
      collection(db, 'inventory'),
      where('workspaceId', '==', currentUser.workspaceId)
    );

    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setOrderCount(snapshot.size);
        const pending = snapshot.docs.filter(d => {
          const status = d.data().status;
          return !status || status === 'Pending';
        }).length;
        setPendingCount(pending);
      },
      (error) => {
        console.error('Realtime orders listener failed:', error);
        setOrderCount(0);
        setPendingCount(0);
      }
    );

    const unsubscribeInventory = onSnapshot(
      inventoryQuery,
      (snapshot) => {
        setInventoryCount(snapshot.size);
        const lowStock = snapshot.docs.filter(d => {
          const qty = d.data().quantity || 0;
          return qty <= 3;
        }).length;
        setLowStockCount(lowStock);
      },
      (error) => {
        console.error('Realtime inventory listener failed:', error);
        setInventoryCount(0);
        setLowStockCount(0);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeInventory();
    };
  }, [currentUser?.workspaceId]);

  useEffect(() => {
    if (!showNotif) return;

    const handleClickOutside = (e) => {
      if (!e.target.closest(
        '#notif-dropdown') &&
        !e.target.closest(
        '#notif-bell')) {
        setShowNotif(false);
      }
    };

    document.addEventListener(
      'mousedown', handleClickOutside
    );
    return () => document.removeEventListener(
      'mousedown', handleClickOutside
    );
  }, [showNotif]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const sidebarLinkBase = 'flex items-center justify-between w-full';

  const navItemClass = ({ isActive }) =>
    `${sidebarLinkBase} px-3 py-2 text-sm rounded-[10px] transition-colors ${
      isActive
        ? 'bg-[#EEF0FF] text-[#5B4FCF] font-bold'
        : 'text-[#0F1F3D] hover:bg-[#F6F8FC]'
    }`;

  return (
    <div className="flex h-screen bg-[#F6F8FC] overflow-hidden font-sans">
      <header className="md:hidden flex items-center justify-between bg-white text-[#0F1F3D] border-b border-[rgba(15,31,61,0.09)] p-4 w-full z-50 absolute top-0 left-0">
        <MunafaLogo size={32} showWordmark />
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((previousState) => !previousState)}
          className="text-2xl leading-none"
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </header>

      <div
        className={`fixed inset-0 bg-black/50 z-30 md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#D6E0F5] shadow-[1px_0_0_0_#B8C5D8] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        <div className="py-5 px-5 shadow-[0_1px_0_0_#B8C5D8]">
          <MunafaLogo size={38} showWordmark />
        </div>

        <div className="py-4 px-4 md:px-5 flex-1 flex flex-col">
          <div>
            <p className="text-[9px] text-[#6D7690] font-bold tracking-[1.2px] mt-4 mb-2 uppercase">Main</p>
            <nav className="space-y-1">
              <NavLink to="/dashboard" onClick={closeMobileMenu} className={navItemClass}>
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/orders" onClick={closeMobileMenu} className={navItemClass}>
                <span>Orders</span>
                <span className="text-xs font-bold bg-[#F6F8FC] text-[#0F1F3D] px-2 py-0.5 rounded-full">{orderCount}</span>
              </NavLink>
              <NavLink to="/inventory-list" onClick={closeMobileMenu} className={navItemClass}>
                <span>Inventory List</span>
                <span className="text-xs font-bold bg-[#F6F8FC] text-[#0F1F3D] px-2 py-0.5 rounded-full">{inventoryCount}</span>
              </NavLink>
            </nav>

            <p className="text-[9px] text-[#6D7690] font-bold tracking-[1.2px] mt-6 mb-2 uppercase">AI Tools</p>
            <nav className="space-y-1">
              <NavLink to="/bulk-import" onClick={closeMobileMenu} className={navItemClass}>
                <span>Bulk Import</span>
                <span className="text-[10px] font-bold bg-[#5B4FCF] text-white px-2 py-0.5 rounded-full">AI</span>
              </NavLink>
              <NavLink to="/ocr-scanner" onClick={closeMobileMenu} className={navItemClass}>
                <span>OCR Scanner</span>
                <span className="text-[10px] font-bold bg-[#5B4FCF] text-white px-2 py-0.5 rounded-full">AI</span>
              </NavLink>
            </nav>

            <p className="text-[9px] text-[#6D7690] font-bold tracking-[1.2px] mt-6 mb-2 uppercase">Insights</p>
            <nav>
              <Link
                to="#"
                onClick={closeMobileMenu}
                className={`${sidebarLinkBase} px-3 py-2 text-sm text-[#0F1F3D] hover:bg-[#F6F8FC] rounded-[10px]`}
              >
                <span>Analytics</span>
                <span />
              </Link>
            </nav>
          </div>

          <div className="mt-auto pt-6 pb-4 space-y-3">
            <div className="rounded-xl bg-[#0F1F3D] p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold tracking-wide">AI Engine</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-200 mb-2">Parser readiness</p>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full w-[78%] bg-[#E8B84B]" />
              </div>
            </div>

            <NavLink
              to="/settings"
              onClick={closeMobileMenu}
              className={navItemClass}
            >
              Settings
            </NavLink>

            <Link
              to="/settings"
              onClick={closeMobileMenu}
              className={`${sidebarLinkBase} px-3 py-2 rounded-xl hover:bg-[#F6F8FC] transition-colors border border-transparent hover:border-[rgba(15,31,61,0.09)]`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#EEF0FF] text-[#5B4FCF] flex items-center justify-center text-sm font-bold shrink-0">
                  {(currentUser?.displayName || currentUser?.firstName || currentUser?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F1F3D] truncate">
                    {currentUser?.displayName ||
                     ((currentUser?.firstName || '') + ' ' + (currentUser?.lastName || '')).trim() ||
                     currentUser?.email?.split('@')[0] ||
                     'User'}
                  </p>
                  <p className="text-xs text-[#6D7690] truncate">{currentUser?.email}</p>
                </div>
              </div>
              <span />
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-16 md:pt-0">
        <div className="sticky top-0 z-30 bg-white border-b border-[rgba(15,31,61,0.09)] px-4 md:px-6 py-3">
          <div className="flex items-center justify-between gap-3 relative">
            <div className="flex items-center">
              {location.pathname !== '/dashboard' && (
                <button
                  onClick={() => navigate(-1)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: '4px', padding: '5px 8px',
                    borderRadius: '7px',
                    border: '1px solid rgba(15,31,61,0.09)',
                    background: '#fff', fontSize: '11px',
                    fontWeight: 600, color: '#4A6080',
                    cursor: 'pointer', marginRight: '8px'
                  }}
                >
                  ← Back
                </button>
              )}
              <h1 className="text-[17px] font-extrabold text-[#0F1F3D]">{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="notif-bell"
                onClick={() => setShowNotif(!showNotif)}
                className="relative h-10 w-10 rounded-xl border border-[rgba(15,31,61,0.09)] bg-white text-[#0F1F3D]"
                aria-label="Notifications"
              >
                🔔
                {(pendingCount > 0 || lowStockCount > 0) && (
                  <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-[#D94040] text-white text-[9px] font-bold flex items-center justify-center">
                    {pendingCount + lowStockCount > 9 ? '9+' : pendingCount + lowStockCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div id="notif-dropdown" style={{
                  position: 'absolute', right: '0px',
                  top: '58px', width: '320px',
                  background: '#fff',
                  border: '1px solid rgba(15,31,61,0.09)',
                  borderRadius: '14px', zIndex: 100,
                  boxShadow: '0 8px 32px rgba(15,31,61,0.15)',
                  overflow: 'hidden'
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(15,31,61,0.09)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#0F1F3D'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      Notifications
                    </span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700,
                      background: '#E8B84B', color: '#0F1F3D',
                      padding: '2px 8px', borderRadius: '20px'
                    }}>
                      {pendingCount + lowStockCount} alerts
                    </span>
                  </div>

                  {/* Pending Orders Alert */}
                  {pendingCount > 0 && (
                    <div
                      onClick={() => { setShowNotif(false); navigate('/orders'); }}
                      style={{
                        padding: '12px 16px', cursor: 'pointer',
                        borderBottom: '1px solid rgba(15,31,61,0.06)',
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F6F8FC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: '#FFF8E6', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', flexShrink: 0
                      }}>⏳</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#0F1F3D', marginBottom: '2px' }}>
                          {pendingCount} Pending Orders
                        </p>
                        <p style={{ fontSize: '11px', color: '#6D7690' }}>
                          Tap to view and update order status
                        </p>
                      </div>
                      <span style={{ fontSize: '10px', color: '#9A6F00', fontWeight: 700,
                        background: '#FFF8E6', padding: '2px 6px', borderRadius: '6px' }}>
                        ACTION
                      </span>
                    </div>
                  )}

                  {/* Low Stock Alert */}
                  {lowStockCount > 0 && (
                    <div
                      onClick={() => { setShowNotif(false); navigate('/inventory-list'); }}
                      style={{
                        padding: '12px 16px', cursor: 'pointer',
                        borderBottom: '1px solid rgba(15,31,61,0.06)',
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F6F8FC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: '#FEF0F0', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', flexShrink: 0
                      }}>📦</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#0F1F3D', marginBottom: '2px' }}>
                          {lowStockCount} Items Low on Stock
                        </p>
                        <p style={{ fontSize: '11px', color: '#6D7690' }}>
                          Tap to restock before running out
                        </p>
                      </div>
                      <span style={{ fontSize: '10px', color: '#D94040', fontWeight: 700,
                        background: '#FEF0F0', padding: '2px 6px', borderRadius: '6px' }}>
                        URGENT
                      </span>
                    </div>
                  )}

                  {/* All clear state */}
                  {pendingCount === 0 && lowStockCount === 0 && (
                    <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                      <p style={{ fontSize: '24px', marginBottom: '8px' }}>✅</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#0F1F3D' }}>All Clear!</p>
                      <p style={{ fontSize: '11px', color: '#6D7690', marginTop: '4px' }}>
                        No pending alerts right now
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div
                    onClick={() => { setShowNotif(false); navigate('/notifications'); }}
                    style={{
                      padding: '12px 16px', cursor: 'pointer',
                      borderTop: '1px solid rgba(15,31,61,0.06)',
                      textAlign: 'center', fontSize: '12px',
                      fontWeight: 700, color: '#5B4FCF',
                      background: '#F6F8FC'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EDE9FF'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F6F8FC'}
                  >
                    View All Notifications →
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="h-10 rounded-full border border-[rgba(15,31,61,0.09)] bg-white px-3 flex items-center gap-2"
              >
                <span className="h-7 w-7 rounded-full bg-[#EEF0FF] text-[#5B4FCF] text-xs font-bold flex items-center justify-center">
                  {(currentUser?.displayName || currentUser?.firstName || currentUser?.email || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-[#0F1F3D] hidden sm:inline">
                  {currentUser?.displayName || currentUser?.firstName || currentUser?.email?.split('@')[0] || 'User'}
                </span>
              </button>
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;
