import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../auth/context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { CheckCheck, ShoppingBag, TrendingDown, Package, Users, Bell } from 'lucide-react';

const TYPE_CONFIG = {
  order_delivered: { icon: ShoppingBag, color: '#1A9E6A', bg: 'rgba(26,158,106,0.10)', label: 'Delivered' },
  order_returned:  { icon: TrendingDown, color: '#D94040', bg: 'rgba(217,64,64,0.10)',  label: 'Returned'  },
  low_stock:       { icon: Package,      color: '#E8833A', bg: 'rgba(232,131,58,0.10)', label: 'Low Stock' },
  member_joined:   { icon: Users,        color: '#5B4FCF', bg: 'rgba(91,79,207,0.10)',  label: 'Team'      },
};

const TAKA = '৳';

const Notifications = () => {
  const { currentUser, workspaceId } = useAuth();
  const navigate = useNavigate();
  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

  const { notifications, unreadCount, markAsRead, markAllAsRead, loading: notifLoading } = useNotifications();

  const [pendingOrders, setPendingOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveWorkspaceId) { setLoading(false); return; }

    const ordersUnsub = onSnapshot(
      query(collection(db, 'orders'), where('workspaceId', '==', effectiveWorkspaceId)),
      (snap) => {
        const pending = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(o => !o.status || o.status === 'Pending')
          .sort((a, b) => {
            const aT = a.timestamp?.toDate?.() || new Date(0);
            const bT = b.timestamp?.toDate?.() || new Date(0);
            return bT - aT;
          });
        setPendingOrders(pending);
      }
    );

    const inventoryUnsub = onSnapshot(
      query(collection(db, 'inventory'), where('workspaceId', '==', effectiveWorkspaceId)),
      (snap) => {
        const low = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(i => (i.quantity || 0) <= 3)
          .sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
        setLowStockItems(low);
        setLoading(false);
      }
    );

    return () => { ordersUnsub(); inventoryUnsub(); };
  }, [effectiveWorkspaceId]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 min-h-screen" style={{ background: '#F6F8FC' }}>

      {/* Header */}
      <div className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #0F1F3D 0%, #1a3260 100%)' }}>
        <p className="text-xs font-bold" style={{ color: '#E8B84B' }}>ALERT CENTER</p>
        <h1 className="text-xl font-extrabold text-white mt-0.5">Notifications</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
        </p>
      </div>

      {/* Firestore Notifications */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden"
        style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(15,31,61,0.06)' }}>
          <div className="flex items-center gap-2">
            <Bell size={15} color="#5B4FCF" />
            <p className="text-sm font-bold" style={{ color: '#0F1F3D' }}>Recent Events</p>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#D94040', color: '#fff' }}>
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: '#5B4FCF', background: 'rgba(91,79,207,0.08)' }}>
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>

        {notifLoading ? (
          <div className="p-6 text-center text-sm" style={{ color: 'rgba(15,31,61,0.45)' }}>
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'rgba(15,31,61,0.45)' }}>
              No events yet — deliver or return an order to see notifications here
            </p>
          </div>
        ) : (
          <div>
            {notifications.slice(0, 20).map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] || {
                icon: Bell, color: '#5B4FCF',
                bg: 'rgba(91,79,207,0.10)', label: 'Alert'
              };
              const Icon = cfg.icon;
              return (
                <div key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className="flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid rgba(15,31,61,0.04)',
                    background: notif.isRead ? 'transparent' : 'rgba(91,79,207,0.03)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F6F8FC'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(91,79,207,0.03)'}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: cfg.bg }}>
                    <Icon size={14} color={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate" style={{ color: '#0F1F3D' }}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: '#5B4FCF' }} />
                      )}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#6D7690' }}>
                      {notif.message}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'rgba(15,31,61,0.35)' }}>
                      {formatTime(notif.timestamp)}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-1"
                    style={{ color: cfg.color, background: cfg.bg }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Orders */}
      {loading ? null : pendingOrders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(15,31,61,0.06)', background: '#FFF8E6' }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">⏳</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#9A6F00' }}>Pending Orders</p>
                <p className="text-[10px]" style={{ color: '#B8860B' }}>
                  {pendingOrders.length} orders awaiting action
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/orders')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: '#9A6F00', color: '#fff' }}>
              Go to Orders →
            </button>
          </div>
          <div>
            {pendingOrders.slice(0, 10).map((order) => {
              const orderDate = order.timestamp?.toDate?.();
              return (
                <div key={order.id} onClick={() => navigate('/orders')}
                  className="flex items-center justify-between px-5 py-3 cursor-pointer transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = '#FFFDF0'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#0F1F3D' }}>
                      {order.name || 'Unknown Customer'}
                    </p>
                    <p className="text-[11px]" style={{ color: '#6D7690' }}>
                      {order.productName || order.category || 'Product'} •{' '}
                      {orderDate ? orderDate.toLocaleDateString('en-GB') : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold" style={{ color: '#0F1F3D' }}>
                      {TAKA}{(order.grossRevenue || order.sellingPrice || 0).toFixed(0)}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#FFF8E6', color: '#9A6F00' }}>
                      Pending
                    </span>
                  </div>
                </div>
              );
            })}
            {pendingOrders.length > 10 && (
              <div className="px-5 py-3 text-center text-xs font-semibold cursor-pointer"
                style={{ color: '#5B4FCF' }} onClick={() => navigate('/orders')}>
                +{pendingOrders.length - 10} more → View all
              </div>
            )}
          </div>
        </div>
      )}

      {/* Low Stock */}
      {loading ? null : lowStockItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(15,31,61,0.06)', background: '#FEF0F0' }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#D94040' }}>Low Stock Alerts</p>
                <p className="text-[10px]" style={{ color: '#E05555' }}>
                  {lowStockItems.length} products need restocking
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/inventory-list')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: '#D94040', color: '#fff' }}>
              Go to Inventory →
            </button>
          </div>
          <div>
            {lowStockItems.map((item) => {
              const isOut = (item.quantity || 0) === 0;
              return (
                <div key={item.id} onClick={() => navigate('/inventory-list')}
                  className="flex items-center justify-between px-5 py-3 cursor-pointer"
                  style={{ borderBottom: '1px solid rgba(15,31,61,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#0F1F3D' }}>
                      {item.name || 'Unknown Product'}
                    </p>
                    <p className="text-[11px]" style={{ color: '#6D7690' }}>
                      {item.category || 'Uncategorized'} • SKU: {item.sku || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold"
                      style={{ color: isOut ? '#6D7690' : '#D94040' }}>
                      {item.quantity || 0}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: isOut ? '#F6F8FC' : '#FEF0F0',
                        color: isOut ? '#6D7690' : '#D94040'
                      }}>
                      {isOut ? 'Out of Stock' : 'Critical'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
