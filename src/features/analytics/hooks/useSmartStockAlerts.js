import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getCountFromServer, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase.js';
import { useAuth } from '../../auth/context/AuthContext';

function getTier(qty) {
  if (qty === 0) return 'out';
  if (qty <= 3) return 'critical';
  return 'low';
}

export function useSmartStockAlerts() {
  const { workspaceId, currentUser } = useAuth();
  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalProducts: 0, outOfStockCount: 0, lowCriticalCount: 0 });
  const [alertItems, setAlertItems] = useState([]);
  const [fetchTick, setFetchTick] = useState(0);

  useEffect(() => {
    if (!effectiveWorkspaceId) { setLoading(false); return; }
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [totalSnap, alertSnap, ordersSnap] = await Promise.all([
          getCountFromServer(query(
            collection(db, 'inventory'),
            where('workspaceId', '==', effectiveWorkspaceId)
          )),
          getDocs(query(
            collection(db, 'inventory'),
            where('workspaceId', '==', effectiveWorkspaceId),
            where('quantity', '<=', 7)
          )),
          getDocs(query(
            collection(db, 'orders'),
            where('workspaceId', '==', effectiveWorkspaceId),
            where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo))
          ))
        ]);

        if (cancelled) return;

        const totalProducts = totalSnap.data().count;

        const velocitySumMap = {};
        ordersSnap.docs.forEach(d => {
          const data = d.data();
          const id = data.inventoryId;
          if (!id) return;
          const qty = Number(data.quantity || data.qty || 0);
          velocitySumMap[id] = (velocitySumMap[id] || 0) + qty;
        });
        const velocityMap = {};
        Object.entries(velocitySumMap).forEach(([id, total]) => {
          velocityMap[id] = +(total / 30).toFixed(2);
        });

        const enriched = alertSnap.docs.map(d => {
          const data = d.data();
          const qty = Number(data.quantity || 0);
          const daily = velocityMap[d.id] || 0;
          const daysUntilStockout = (daily > 0 && qty > 0)
            ? Math.ceil(qty / daily)
            : null;
          return {
            id: d.id,
            name: data.name || data.productName || 'Unknown',
            quantity: qty,
            tier: getTier(qty),
            dailyVelocity: daily,
            daysUntilStockout,
          };
        }).sort((a, b) => a.quantity - b.quantity);

        const outOfStockCount = enriched.filter(i => i.tier === 'out').length;
        const lowCriticalCount = enriched.filter(i => i.tier === 'critical' || i.tier === 'low').length;

        setStats({ totalProducts, outOfStockCount, lowCriticalCount });
        setAlertItems(enriched);
      } catch (err) {
        console.error('useSmartStockAlerts error:', err);
        if (!cancelled) {
          setStats({ totalProducts: 0, outOfStockCount: 0, lowCriticalCount: 0 });
          setAlertItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [effectiveWorkspaceId, fetchTick]);

  const refresh = () => setFetchTick(t => t + 1);

  return { loading, stats, alertItems, refresh };
}
