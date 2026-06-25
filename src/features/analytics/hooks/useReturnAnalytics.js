import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase.js';
import { useAuth } from '../../auth/context/AuthContext';

export function useReturnAnalytics() {
  const { workspaceId, currentUser } = useAuth();
  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [fetchTick, setFetchTick] = useState(0);

  useEffect(() => {
    if (!effectiveWorkspaceId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('workspaceId', '==', effectiveWorkspaceId)
        );
        const snap = await getDocs(q);
        if (!cancelled) {
          setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error('useReturnAnalytics fetch error:', err);
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrders();
    return () => { cancelled = true; };
  }, [effectiveWorkspaceId, fetchTick]);

  const analytics = useMemo(() => {
    const shippedOrders = orders.filter(
      o => o.status === 'Delivered' || o.status === 'Returned'
    );
    const totalShipped = shippedOrders.length;
    const totalDelivered = orders.filter(o => o.status === 'Delivered').length;
    const totalReturned = orders.filter(o => o.status === 'Returned').length;

    const successRate = totalShipped > 0
      ? ((totalDelivered / totalShipped) * 100).toFixed(1)
      : '0.0';
    const returnRate = totalShipped > 0
      ? ((totalReturned / totalShipped) * 100).toFixed(1)
      : '0.0';

    const cashBurned = orders
      .filter(o => o.status === 'Returned')
      .reduce((sum, o) => {
        const forwardCost = Number(o.deliveryCost || o.delivery || 0);
        return (
          sum +
          Number(o.adSpend || 0) +
          Number(o.packaging || 0) +
          forwardCost +
          Number(o.returnDeliveryCost || forwardCost)
        );
      }, 0);

    // Group by productName for SKU-level return rates
    const skuMap = {};
    orders.forEach(o => {
      const name = o.productName;
      if (!name) return;
      if (!skuMap[name]) skuMap[name] = { totalOrders: 0, returnedOrders: 0 };
      skuMap[name].totalOrders += 1;
      if (o.status === 'Returned') skuMap[name].returnedOrders += 1;
    });

    const skuReturnData = Object.entries(skuMap)
      .map(([productName, counts]) => ({
        productName,
        totalOrders: counts.totalOrders,
        returnedOrders: counts.returnedOrders,
        returnRate: ((counts.returnedOrders / counts.totalOrders) * 100).toFixed(1),
      }))
      .sort((a, b) => Number(b.returnRate) - Number(a.returnRate));

    return {
      totalShipped,
      totalDelivered,
      totalReturned,
      successRate,
      returnRate,
      cashBurned,
      skuReturnData,
    };
  }, [orders]);

  const refresh = () => setFetchTick(t => t + 1);

  return {
    loading,
    ...analytics,
    refresh,
  };
}
