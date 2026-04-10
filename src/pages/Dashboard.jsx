import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase.js';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

const Dashboard = () => {
  const { currentUser } = useAuth();

  const [kpis, setKpis] = useState({
    revenue: 0,
    profit: 0,
    orders: 0,
    pending: 0
  });
  const [rawOrders, setRawOrders] = useState([]);
  const [timeframe, setTimeframe] = useState('7d');
  const [topCategories, setTopCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatCurrency = (value) =>
    `৳ ${Number(value || 0).toLocaleString('en-US')}`;

  const profitMargin = kpis.revenue > 0 ? ((kpis.profit / kpis.revenue) * 100).toFixed(1) : 0;
  const avgDaily = (kpis.revenue / 30).toFixed(0);

  const chartData = useMemo(() => {
    const dayCount = timeframe === '30d' ? 30 : 7;
    const dateMap = new Map();
    const dayBuckets = [];

    const toDateKey = (dateObj) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    for (let i = dayCount - 1; i >= 0; i -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);

      const key = toDateKey(date);
      dateMap.set(key, 0);

      dayBuckets.push({
        key,
        date: timeframe === '30d'
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }

    rawOrders.forEach((order) => {
      const orderDate = order?.timestamp?.toDate?.();
      if (!orderDate) return;

      const normalized = new Date(orderDate);
      normalized.setHours(0, 0, 0, 0);
      const dayKey = toDateKey(normalized);
      if (!dateMap.has(dayKey)) return;

      const selling = Number(order?.sellingPrice ?? 0);
      const discount = Number(order?.discountPrice ?? 0);
      const effectiveRevenue = discount > 0 ? discount : selling;
      const price = Number.isFinite(effectiveRevenue) ? effectiveRevenue : 0;

      dateMap.set(dayKey, dateMap.get(dayKey) + price);
    });

    return dayBuckets.map((bucket) => ({
      date: bucket.date,
      revenue: dateMap.get(bucket.key) || 0
    }));
  }, [rawOrders, timeframe]);

  const injectTestData = async () => {
    if (!currentUser?.workspaceId) {
      alert('No workspace found for this user.');
      return;
    }

    const fakeOrders = [
      {
        workspaceId: currentUser.workspaceId,
        category: 'Clothing',
        sellingPrice: Math.floor(Math.random() * 2500) + 2200,
        netProfit: Math.floor(Math.random() * 900) + 600,
        status: 'Delivered',
        timestamp: serverTimestamp()
      },
      {
        workspaceId: currentUser.workspaceId,
        category: 'Shoes',
        sellingPrice: Math.floor(Math.random() * 2600) + 2400,
        netProfit: Math.floor(Math.random() * 850) + 650,
        status: 'Delivered',
        timestamp: serverTimestamp()
      },
      {
        workspaceId: currentUser.workspaceId,
        category: 'Electronics',
        sellingPrice: Math.floor(Math.random() * 3200) + 3000,
        netProfit: Math.floor(Math.random() * 1100) + 700,
        status: 'Delivered',
        timestamp: serverTimestamp()
      },
      {
        workspaceId: currentUser.workspaceId,
        category: 'Accessories',
        sellingPrice: Math.floor(Math.random() * 2100) + 1800,
        netProfit: Math.floor(Math.random() * 700) + 500,
        status: 'Delivered',
        timestamp: serverTimestamp()
      },
      {
        workspaceId: currentUser.workspaceId,
        category: 'Clothing',
        sellingPrice: Math.floor(Math.random() * 2800) + 2500,
        netProfit: Math.floor(Math.random() * 950) + 650,
        status: 'Delivered',
        timestamp: serverTimestamp()
      }
    ];

    for (const order of fakeOrders) {
      await addDoc(collection(db, 'orders'), order);
    }

    alert('Test data injected! Refreshing...');
    window.location.reload();
  };

  useEffect(() => {
    if (!currentUser?.workspaceId) {
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);

      try {
        const effectiveDashboardWorkspaceId = 
          currentUser?.workspaceId || 
          currentUser?.uid || null;

        if (!effectiveDashboardWorkspaceId) return;

        const ordersQuery = query(
          collection(db, 'orders'),
          where('workspaceId', '==', 
            effectiveDashboardWorkspaceId)
        );
        const querySnapshot = await getDocs(ordersQuery);
        const orders = querySnapshot.docs.map((docSnap) => docSnap.data());

        let totalRevenue = 0;
        let totalProfit = 0;
        let pendingCount = 0;
        const categoryMap = {};

        orders.forEach((order) => {
          const effectiveRevenue = 
            Number(order?.totalRevenue ?? 0);
          const price = Number.isFinite(effectiveRevenue) ? effectiveRevenue : 0;
          totalRevenue += price;

          const cat = order?.category || 'Uncategorized';
          categoryMap[cat] = (categoryMap[cat] || 0) + price;

          const profit = Number(
            order?.trueNetProfit ?? 
            order?.finalProfit ?? 
            order?.netProfit ?? 
            0
          );
          totalProfit += Number.isFinite(profit) ? profit : 0;

          if (order?.status === 'Pending' || !order?.status) {
            pendingCount += 1;
          }
        });

        const sortedCats = Object.entries(categoryMap)
          .map(([name, rev]) => ({
            name,
            revenue: rev,
            percent: totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 3);

        setKpis({
          revenue: totalRevenue,
          profit: totalProfit,
          orders: orders.length,
          pending: pendingCount
        });
        setRawOrders(querySnapshot.docs.map((doc) => doc.data()));
        setTopCategories(sortedCats);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setKpis({
          revenue: 0,
          profit: 0,
          orders: 0,
          pending: 0
        });
        setRawOrders([]);
        setTopCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser?.workspaceId]);

  return (
    <div className="bg-[#f8f9fa] min-h-screen p-4 md:p-8 font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">{currentDate}</p>
      </div>

      <div className="bg-[#6366f1] text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <p className="text-sm md:text-base text-indigo-100">Good morning {currentUser?.firstName || 'Owner'} 👋</p>
          <h2 className="text-2xl md:text-4xl font-bold mt-1">{currentUser?.shopName || 'My Boutique'}</h2>
          <p className="text-sm md:text-base text-indigo-100 mt-3">Your shop is performing 12.4% better than last month.</p>
        </div>

        <div className="flex flex-row flex-wrap justify-center gap-4 w-full md:w-auto">
          <div className="bg-white/20 rounded-full px-6 py-3 text-center">
            <p className="text-lg md:text-xl font-bold">৳ {Number(avgDaily).toLocaleString('en-US')}</p>
            <p className="text-xs text-indigo-100 mt-1">Avg daily revenue</p>
          </div>
          <div className="bg-white/20 rounded-full px-6 py-3 text-center">
            <p className="text-lg md:text-xl font-bold">{profitMargin}%</p>
            <p className="text-xs text-indigo-100 mt-1">Profit margin</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {isLoading ? '...' : formatCurrency(kpis.revenue)}
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-slate-500">Net Profit</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {isLoading ? '...' : formatCurrency(kpis.profit)}
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total Orders</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {isLoading ? '...' : kpis.orders.toLocaleString()}
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-slate-500">Pending Delivery</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {isLoading ? '...' : kpis.pending.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Facebook Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-slate-200">
          <div className="pr-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Page Followers</p>
            <p className="text-xl font-bold text-slate-800 mt-2">45.2K</p>
          </div>
          <div className="pl-4 pr-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Ad Spend</p>
            <p className="text-xl font-bold text-slate-800 mt-2">৳ 3,200</p>
          </div>
          <div className="pl-4 pr-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Msg Inquiries</p>
            <p className="text-xl font-bold text-slate-800 mt-2">38</p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">CPA</p>
            <p className="text-xl font-bold text-slate-800 mt-2">৳ 145</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="text-lg font-semibold text-slate-800">Revenue Trend</h3>
            <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setTimeframe('7d')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  timeframe === '7d'
                    ? 'bg-indigo-50 text-indigo-600 font-bold'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('30d')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  timeframe === '30d'
                    ? 'bg-indigo-50 text-indigo-600 font-bold'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#7c3aed"
                fill="url(#revenueFill)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Top Categories</h3>
          {topCategories.length === 0 ? (
            <p className="text-sm text-slate-500">No category data yet</p>
          ) : (
            topCategories.map((cat, index) => (
              <div key={index} className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{cat.name}</span>
                  <span className="text-slate-500">{cat.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${cat.percent}%` }}></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <button onClick={injectTestData} className="mt-8 bg-red-500 text-white px-4 py-2 rounded">
        DEV: Inject Test Orders
      </button>
    </div>
  );
};

export default Dashboard;