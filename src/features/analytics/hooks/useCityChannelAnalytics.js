import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase.js';
import { useAuth } from '../../auth/context/AuthContext';

function groupOrdersBy(orders, field) {
  const map = {};
  orders.forEach(o => {
    const key = (o[field] && String(o[field]).trim()) || 'Unknown';
    if (!map[key]) {
      map[key] = { orderCount: 0, totalProfit: 0, deliveredCount: 0, returnedCount: 0 };
    }
    map[key].orderCount += 1;
    map[key].totalProfit += Number(o.trueNetProfit || 0);
    if (o.status === 'Delivered') map[key].deliveredCount += 1;
    if (o.status === 'Returned') map[key].returnedCount += 1;
  });
  return Object.entries(map)
    .map(([name, c]) => {
      const shipped = c.deliveredCount + c.returnedCount;
      return {
        name,
        orderCount: c.orderCount,
        totalProfit: c.totalProfit,
        deliveredCount: c.deliveredCount,
        returnedCount: c.returnedCount,
        returnRate: shipped > 0 ? ((c.returnedCount / shipped) * 100).toFixed(1) : '0.0',
      };
    })
    .sort((a, b) => b.totalProfit - a.totalProfit);
}

export function useCityChannelAnalytics() {
  const { workspaceId, currentUser } = useAuth();
  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [fetchTick, setFetchTick] = useState(0);

  useEffect(() => {
    if (!effectiveWorkspaceId) { setLoading(false); return; }
    let cancelled = false;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('workspaceId', '==', effectiveWorkspaceId)
        );
        const snap = await getDocs(q);
        if (!cancelled) setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('useCityChannelAnalytics fetch error:', err);
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOrders();
    return () => { cancelled = true; };
  }, [effectiveWorkspaceId, fetchTick]);

  const byCity = useMemo(() => groupOrdersBy(orders, 'city'), [orders]);
  const byChannel = useMemo(() => groupOrdersBy(orders, 'channel'), [orders]);

  const refresh = () => setFetchTick(t => t + 1);

  return { loading, byCity, byChannel, refresh };
}
