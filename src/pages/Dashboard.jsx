import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import {
  TrendingUp, ShoppingBag, DollarSign,
  Clock, Sparkles, ArrowUpRight, ArrowDownRight,
  ChevronRight, AlertTriangle
} from 'lucide-react';
import { db } from '../firebase.js';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
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
  const [cpaValue, setCpaValue] = useState(0);
  const [returnRate, setReturnRate] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [topCategories, setTopCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);
  const [totalAdSpend, setTotalAdSpend] = useState(0);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatCurrency = (value) =>
    `৳ ${Number(value || 0).toLocaleString('en-US')}`;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 20) return 'Good evening';
    return 'Good night';
  };

  const profitMargin = kpis.revenue > 0 ? ((kpis.profit / kpis.revenue) * 100).toFixed(1) : 0;
  const avgDaily = (kpis.revenue / 30).toFixed(0);

  const chartData = useMemo(() => {
    const dayCount = timeframe === '60d' ? 60 : timeframe === '30d' ? 30 : 7;
    const dateMap = new Map();
    const profitMap = new Map();
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
      profitMap.set(key, 0);

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

      const price = Number(
        order?.grossRevenue ??
        order?.totalRevenue ??
        order?.sellingPrice ?? 0
      );

      dateMap.set(dayKey, dateMap.get(dayKey) + price);
      const orderProfit = Number(order?.trueNetProfit ?? order?.finalProfit ?? order?.netProfit ?? 0);
      profitMap.set(dayKey, (profitMap.get(dayKey) || 0) + orderProfit);
    });

    return dayBuckets.map((bucket) => ({
      date: bucket.date,
      revenue: dateMap.get(bucket.key) || 0,
      profit: profitMap.get(bucket.key) || 0
    }));
  }, [rawOrders, timeframe]);

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
        let adSpendTotal = 0;
        const categoryMap = {};

        orders.forEach((order) => {
          const effectiveRevenue = 
            Number(order?.totalRevenue ?? 0);
          const price = Number.isFinite(effectiveRevenue) ? effectiveRevenue : 0;
          totalRevenue += price;

          const cat = order?.category || 'Uncategorized';
          categoryMap[cat] = (categoryMap[cat] || 0) + price;

          const stored = order?.trueNetProfit ?? order?.finalProfit ?? order?.netProfit;
          const profit = (stored !== undefined && stored !== null && stored !== '')
            ? Number(stored)
            : (() => {
                const rev = Number(order?.grossRevenue ?? order?.totalRevenue ?? 0);
                const cost = Number(order?.productCost ?? 0) * Number(order?.qty ?? 1);
                const packaging = Number(order?.packaging ?? order?.packagingCost ?? 0);
                const adSpend = Number(order?.totalAdSpend ?? (order?.adCost ?? 0) * Number(order?.qty ?? 1));
                const delivery = Number(order?.sellerDeliveryCost ?? order?.deliveryCost ?? 0);
                const discount = Number(order?.totalDiscount ?? 0);
                return rev - cost - packaging - adSpend - delivery - discount;
              })();
          totalProfit += Number.isFinite(profit) ? profit : 0;

          if (order?.status === 'Pending' || !order?.status) {
            pendingCount += 1;
          }
          if (order?.status === 'Returned') {
            // counted for return rate
          }
          adSpendTotal += Number(order?.adCost || order?.flatAdSpend || 0);
        });

        const sortedRecent = querySnapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .filter(o => o.timestamp)
          .sort((a, b) => {
            const aTime = a.timestamp?.toDate?.() || new Date(0);
            const bTime = b.timestamp?.toDate?.() || new Date(0);
            return bTime - aTime;
          })
          .slice(0, 5);
        setRecentOrders(sortedRecent);
        setTotalAdSpend(adSpendTotal);
        const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
        const returnedOrders = orders.filter(o => o.status === 'Returned').length;
        const cpa = orders.length > 0 ? Math.round(adSpendTotal / orders.length) : 0;
        const rRate = orders.length > 0 ? ((returnedOrders / orders.length) * 100).toFixed(1) : 0;
        setCpaValue(cpa);
        setReturnRate(rRate);
        setDeliveredCount(deliveredOrders);

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
    <div className="p-4 sm:p-6 space-y-5 min-h-screen font-sans" style={{ background: '#F6F8FC' }}>

      {/* HERO BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl text-white"
        style={{ background: 'linear-gradient(135deg, #0F1F3D 0%, #1a3260 100%)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#E8B84B' }}>{getGreeting()} 👋</p>
          <h2 className="text-xl font-extrabold text-white mt-0.5">
            {currentUser?.displayName ||
             ((currentUser?.firstName || '') + ' ' + (currentUser?.lastName || '')).trim() ||
             currentUser?.email?.split('@')[0] ||
             'Welcome'}
          </h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{currentDate}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-4 py-2 rounded-xl text-center"
            style={{ background: 'rgba(232,184,75,0.15)', border: '1px solid rgba(232,184,75,0.3)' }}>
            <p className="text-lg font-extrabold" style={{ color: '#E8B84B' }}>{formatCurrency(avgDaily)}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Avg daily revenue</p>
          </div>
          <div className="px-4 py-2 rounded-xl text-center"
            style={{ background: 'rgba(232,184,75,0.15)', border: '1px solid rgba(232,184,75,0.3)' }}>
            <p className="text-lg font-extrabold" style={{ color: '#E8B84B' }}>{profitMargin}%</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Profit margin</p>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Revenue',
            value: isLoading ? '...' : formatCurrency(kpis.revenue),
            sub: 'Gross revenue all time',
            icon: DollarSign,
            iconBg: '#EBF1FF',
            iconColor: '#2E5BA8',
            up: true,
          },
          {
            label: 'Net Profit',
            value: isLoading ? '...' : formatCurrency(kpis.profit),
            sub: `${profitMargin}% margin`,
            icon: TrendingUp,
            iconBg: '#E6F7EF',
            iconColor: '#0D7A4E',
            up: true,
          },
          {
            label: 'Total Orders',
            value: isLoading ? '...' : kpis.orders.toLocaleString(),
            sub: `${kpis.pending} pending`,
            icon: ShoppingBag,
            iconBg: '#F0F4FF',
            iconColor: '#5B4FCF',
            up: true,
          },
          {
            label: 'Pending Delivery',
            value: isLoading ? '...' : kpis.pending.toLocaleString(),
            sub: 'Awaiting fulfillment',
            icon: Clock,
            iconBg: '#FFF8E6',
            iconColor: '#9A6F00',
            up: false,
          },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm"
            style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: k.iconBg }}>
                <k.icon size={16} style={{ color: k.iconColor }} />
              </div>
              <span className="flex items-center gap-0.5 text-xs font-medium"
                style={{ color: k.up ? '#0D7A4E' : '#9A6F00' }}>
                {k.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              </span>
            </div>
            <p className="text-lg font-extrabold" style={{ color: '#0F1F3D' }}>{k.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6D7690' }}>{k.label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#8BA0BC' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* BUSINESS INTELLIGENCE ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6D7690' }}>Total Ad Spend</p>
          <p className="text-xl font-extrabold" style={{ color: '#0F1F3D' }}>{formatCurrency(totalAdSpend)}</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#8BA0BC' }}>Across all orders</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6D7690' }}>Cost Per Order</p>
          <p className="text-xl font-extrabold" style={{ color: '#0F1F3D' }}>{formatCurrency(cpaValue)}</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#8BA0BC' }}>Ad spend ÷ orders</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6D7690' }}>Delivered</p>
          <p className="text-xl font-extrabold" style={{ color: '#1A9E6A' }}>{deliveredCount}</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#8BA0BC' }}>Fulfilled orders</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6D7690' }}>Return Rate</p>
          <p className="text-xl font-extrabold" style={{ color: Number(returnRate) > 10 ? '#D94040' : '#0F1F3D' }}>
            {returnRate}%
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: '#8BA0BC' }}>Returned orders</p>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#0F1F3D' }}>Revenue Trend</h3>
              <p className="text-xs mt-0.5" style={{ color: '#6D7690' }}>Daily revenue performance</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F6F8FC' }}>
              {[
                { key: '7d', label: '7 Days' },
                { key: '30d', label: '30 Days' },
                { key: '60d', label: '60 Days' }
              ].map((t) => (
                <button key={t.key} type="button" onClick={() => setTimeframe(t.key)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all duration-150"
                  style={{
                    background: timeframe === t.key ? '#fff' : 'transparent',
                    color: timeframe === t.key ? '#0F1F3D' : '#6D7690',
                    fontWeight: timeframe === t.key ? 700 : 400,
                    boxShadow: timeframe === t.key ? '0 1px 4px rgba(15,31,61,0.1)' : 'none'
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8B84B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E8B84B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A9E6A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1A9E6A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" name="Revenue"
                stroke="#E8B84B" strokeWidth={2.5} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="profit" name="Profit"
                stroke="#1A9E6A" strokeWidth={2} fill="url(#profGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: '#0F1F3D' }}>Top Categories</h3>
          <p className="text-xs mb-4" style={{ color: '#6D7690' }}>By total revenue</p>
          {topCategories.length === 0 ? (
            <p className="text-sm" style={{ color: '#6D7690' }}>
              {isLoading ? 'Loading...' : 'No category data yet'}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topCategories}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: '#4A6080', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={75}
                />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid rgba(15,31,61,0.09)',
                    borderRadius: '10px',
                    fontSize: '11px'
                  }}
                  cursor={{ fill: 'rgba(232,184,75,0.08)' }}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#E8B84B"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* BOTTOM ROW — Recent Orders + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(15,31,61,0.06)' }}>
            <h3 className="text-sm font-bold" style={{ color: '#0F1F3D' }}>Recent Orders</h3>
            <a href="/orders" className="text-xs flex items-center gap-0.5 font-semibold"
              style={{ color: '#5B4FCF' }}>
              View all <ChevronRight size={12} />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F6F8FC', borderBottom: '1px solid rgba(15,31,61,0.06)' }}>
                  {['Customer', 'Product', 'Status', 'Profit'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: '#6D7690' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm"
                      style={{ color: '#6D7690' }}>
                      {isLoading ? 'Loading...' : 'No orders yet'}
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => {
                    const profit = Number(o?.trueNetProfit ?? o?.finalProfit ?? o?.netProfit ?? 0);
                    const status = o?.status || 'Pending';
                    const statusColors = {
                      Delivered: { bg: '#E6F7EF', color: '#0D7A4E' },
                      Pending:   { bg: '#FFF8E6', color: '#9A6F00' },
                      Shipped:   { bg: '#EBF1FF', color: '#2E5BA8' },
                      Returned:  { bg: '#FEF0F0', color: '#D94040' },
                    };
                    const sc = statusColors[status] || statusColors.Pending;
                    return (
                      <tr key={o.id} className="transition-colors"
                        style={{ borderBottom: '1px solid rgba(15,31,61,0.04)' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FBFF'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold" style={{ color: '#0F1F3D' }}>{o.name || 'Unknown'}</p>
                          <p className="text-[10px]" style={{ color: '#6D7690' }}>{o.phone || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[120px] truncate" style={{ color: '#6D7690' }}>
                          {o.productName || o.category || 'Product'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: sc.bg, color: sc.color }}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-extrabold"
                            style={{ color: profit >= 0 ? '#1A9E6A' : '#D94040' }}>
                            {profit >= 0 ? '+' : '-'}৳{Math.abs(profit).toFixed(0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights — data driven */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
          <div className="flex items-center gap-2 px-5 py-4"
            style={{ borderBottom: '1px solid rgba(15,31,61,0.06)' }}>
            <Sparkles size={14} style={{ color: '#5B4FCF' }} />
            <h3 className="text-sm font-bold" style={{ color: '#0F1F3D' }}>Business Insights</h3>
            <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: '#EDE9FF', color: '#5B4FCF' }}>AI</span>
          </div>
          <div className="p-4 space-y-3">

            <div className="p-3.5 rounded-xl"
              style={{
                background: Number(profitMargin) >= 20 ? '#E6F7EF' : '#FEF0F0',
                border: `1px solid ${Number(profitMargin) >= 20 ? '#B6EDD4' : '#FCCFCF'}`
              }}>
              <div className="flex items-center gap-1.5 mb-1 text-xs font-bold"
                style={{ color: Number(profitMargin) >= 20 ? '#0D7A4E' : '#D94040' }}>
                <TrendingUp size={13} />
                Profit Health
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#4A6080' }}>
                {Number(profitMargin) >= 20
                  ? `Your ${profitMargin}% margin is healthy. Keep monitoring costs to protect it.`
                  : `Your ${profitMargin}% margin is below 20%. Review product costs and ad spend.`}
              </p>
            </div>

            <div className="p-3.5 rounded-xl"
              style={{ background: '#FFF8E6', border: '1px solid #FFE9A0' }}>
              <div className="flex items-center gap-1.5 mb-1 text-xs font-bold"
                style={{ color: '#9A6F00' }}>
                <AlertTriangle size={13} />
                Pending Orders
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#4A6080' }}>
                {kpis.pending === 0
                  ? 'All orders fulfilled! Great work keeping up with delivery.'
                  : `${kpis.pending} orders are pending. Follow up to maintain customer satisfaction.`}
              </p>
            </div>

            <div className="p-3.5 rounded-xl"
              style={{ background: '#EDE9FF', border: '1px solid #C4B5FD' }}>
              <div className="flex items-center gap-1.5 mb-1 text-xs font-bold"
                style={{ color: '#5B4FCF' }}>
                <Sparkles size={13} />
                Top Performer
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#4A6080' }}>
                {topCategories.length > 0
                  ? `${topCategories[0].name} leads at ${topCategories[0].percent}% of revenue. Consider expanding this category.`
                  : 'Add more orders to see your top performing category here.'}
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;