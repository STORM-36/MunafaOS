import React from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { useAuth } from '../../auth/context/AuthContext';

const Notifications = () => {
  const { currentUser, workspaceId } = useAuth();
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

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

  const totalAlerts = pendingOrders.length + lowStockItems.length;

  return (
    <div className="p-4 sm:p-6 space-y-5 min-h-screen" style={{ background: '#F6F8FC' }}>

      {/* Header */}
      <div className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #0F1F3D 0%, #1a3260 100%)' }}>
        <p className="text-xs font-bold" style={{ color: '#E8B84B' }}>ALERT CENTER</p>
        <h1 className="text-xl font-extrabold text-white mt-0.5">Notifications</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {loading ? 'Loading...' : `${totalAlerts} active alert${totalAlerts !== 1 ? 's' : ''} requiring attention`}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading alerts...</div>
      ) : totalAlerts === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm"
          style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <p className="text-4xl mb-3">✅</p>
          <p className="text-lg font-bold" style={{ color: '#0F1F3D' }}>All Clear!</p>
          <p className="text-sm mt-1" style={{ color: '#6D7690' }}>
            No pending alerts right now. Great work!
          </p>
        </div>
      ) : (
        <>
          {/* Pending Orders Section */}
          {pendingOrders.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden"
              style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(15,31,61,0.06)', background: '#FFF8E6' }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏳</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#9A6F00' }}>
                      Pending Orders
                    </p>
                    <p className="text-[10px]" style={{ color: '#B8860B' }}>
                      {pendingOrders.length} orders awaiting action
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/orders')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: '#9A6F00', color: '#fff' }}
                >
                  Go to Orders →
                </button>
              </div>
              <div className="divide-y" style={{ divideColor: 'rgba(15,31,61,0.04)' }}>
                {pendingOrders.slice(0, 10).map((order) => {
                  const orderDate = order.timestamp?.toDate?.();
                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate('/orders')}
                      className="flex items-center justify-between px-5 py-3 cursor-pointer transition-colors"
                      onMouseEnter={e => e.currentTarget.style.background = '#FFFDF0'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
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
                          ৳{(order.grossRevenue || order.sellingPrice || 0).toFixed(0)}
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
                  <div className="px-5 py-3 text-center text-xs font-semibold"
                    style={{ color: '#5B4FCF', cursor: 'pointer' }}
                    onClick={() => navigate('/orders')}
                  >
                    +{pendingOrders.length - 10} more pending orders → View all
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Low Stock Section */}
          {lowStockItems.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden"
              style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(15,31,61,0.06)', background: '#FEF0F0' }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#D94040' }}>
                      Low Stock Alerts
                    </p>
                    <p className="text-[10px]" style={{ color: '#E05555' }}>
                      {lowStockItems.length} products need restocking
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/inventory-list')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: '#D94040', color: '#fff' }}
                >
                  Go to Inventory →
                </button>
              </div>
              <div>
                {lowStockItems.map((item) => {
                  const isOut = (item.quantity || 0) === 0;
                  const isCritical = (item.quantity || 0) > 0 && (item.quantity || 0) <= 3;
                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate('/inventory-list')}
                      className="flex items-center justify-between px-5 py-3 cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid rgba(15,31,61,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
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
        </>
      )}
    </div>
  );
};

export default Notifications;
