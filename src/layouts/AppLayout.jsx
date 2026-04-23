import { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';

const AppLayout = () => {
  const { currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
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
      (snapshot) => setOrderCount(snapshot.size),
      (error) => {
        console.error('Realtime orders listener failed:', error);
        setOrderCount(0);
      }
    );

    const unsubscribeInventory = onSnapshot(
      inventoryQuery,
      (snapshot) => setInventoryCount(snapshot.size),
      (error) => {
        console.error('Realtime inventory listener failed:', error);
        setInventoryCount(0);
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
        <h1 className="text-lg font-extrabold">MunafaOS</h1>
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
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#D6E0F5] border-r border-[rgba(15,31,61,0.09)] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        <div className="py-6 px-6 border-b border-[rgba(15,31,61,0.09)]">
          <h2 className="text-xl font-extrabold text-[#0F1F3D]">MunafaOS</h2>
          <p className="text-[11px] text-[#5F6B7D] mt-1 break-words whitespace-normal">Seller Suite</p>
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
              <NavLink to="/add-inventory" onClick={closeMobileMenu} className={navItemClass}>
                <span>Add Inventory</span>
                <span className="text-[10px] font-bold bg-[#5B4FCF] text-white px-2 py-0.5 rounded-full">AI</span>
              </NavLink>
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
                  {(currentUser?.shopName || 'Shop Admin').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F1F3D] truncate">{currentUser?.shopName || 'Shop Admin'}</p>
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
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#D94040]" />
              </button>

              {showNotif && (
                <div id="notif-dropdown" style={{
                  position: 'absolute', right: '100px',
                  top: '58px', width: '300px',
                  background: '#fff',
                  border: '1px solid rgba(15,31,61,0.09)',
                  borderRadius: '12px', zIndex: 100,
                  boxShadow: '0 8px 24px rgba(15,31,61,0.12)'
                }}>
                  <div style={{ padding: '12px 16px',
                    borderBottom: '1px solid rgba(15,31,61,0.09)',
                    fontSize: '12px', fontWeight: 700,
                    color: '#0F1F3D'
                  }}>Notifications</div>
                  <div style={{ padding: '10px 16px',
                    fontSize: '11px', color: '#4A6080',
                    borderBottom: '1px solid rgba(15,31,61,0.09)'
                  }}>
                    <div style={{ fontWeight: 700,
                      color: '#0F1F3D', marginBottom: '2px'
                    }}>48 orders pending delivery</div>
                    <div style={{ color: '#8BA0BC' }}>
                      Needs your attention
                    </div>
                  </div>
                  <div style={{ padding: '10px 16px',
                    fontSize: '11px', color: '#4A6080',
                    borderBottom: '1px solid rgba(15,31,61,0.09)'
                  }}>
                    <div style={{ fontWeight: 700,
                      color: '#0F1F3D', marginBottom: '2px'
                    }}>7 items low on stock</div>
                    <div style={{ color: '#8BA0BC' }}>
                      Restock soon
                    </div>
                  </div>
                  <div onClick={() => {
                    setShowNotif(false);
                    navigate('/settings');
                  }} style={{ padding: '10px 16px',
                    fontSize: '11px', color: '#5B4FCF',
                    fontWeight: 600, cursor: 'pointer',
                    textAlign: 'center'
                  }}>View all notifications</div>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="h-10 rounded-full border border-[rgba(15,31,61,0.09)] bg-white px-3 flex items-center gap-2"
              >
                <span className="h-7 w-7 rounded-full bg-[#EEF0FF] text-[#5B4FCF] text-xs font-bold flex items-center justify-center">
                  {(currentUser?.shopName || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-[#0F1F3D] hidden sm:inline">{currentUser?.shopName || 'User'}</span>
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
