import React from 'react';
import { MapPin, Radio, TrendingDown } from 'lucide-react';
import { useCityChannelAnalytics } from '../hooks/useCityChannelAnalytics';
import SKUReturnTable from '../components/SKUReturnTable';

const TAKA = '৳';

function returnColor(rate) {
  const r = Number(rate);
  if (r < 10) return '#1A9E6A';
  if (r <= 20) return '#E8B84B';
  return '#D94040';
}

function BreakdownCard({ title, subtitle, icon, iconBg, rows }) {
  const maxProfit = Math.max(...rows.map(r => Math.abs(r.totalProfit)), 1);
  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm"
      style={{ border: '1px solid rgba(15,31,61,0.09)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#0F1F3D' }}>{title}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(15,31,61,0.45)' }}>{subtitle}</p>
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'rgba(15,31,61,0.45)' }}>
          No order data yet
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map(row => {
            const pct = Math.round((Math.abs(row.totalProfit) / maxProfit) * 100);
            const profitColor = row.totalProfit >= 0 ? '#0F1F3D' : '#D94040';
            return (
              <div key={row.name}>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold" style={{ color: '#0F1F3D' }}>{row.name}</span>
                  <span className="font-bold" style={{ color: profitColor }}>
                    {TAKA}{row.totalProfit.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(15,31,61,0.07)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: '#5B4FCF' }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[11px]" style={{ color: 'rgba(15,31,61,0.45)' }}>
                    {row.orderCount} orders &middot; {row.deliveredCount} delivered
                  </span>
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: returnColor(row.returnRate), background: 'rgba(15,31,61,0.04)' }}
                  >
                    {row.returnRate}% return
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { loading, byCity, byChannel } = useCityChannelAnalytics();

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 shadow-sm animate-pulse"
              style={{ border: '1px solid rgba(15,31,61,0.09)', height: '240px' }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: '#0F1F3D' }}>Profit Analytics</h2>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(15,31,61,0.45)' }}>
          Profit and return rate broken down by city and sales channel
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownCard
          title="Profit by City"
          subtitle="Where your profit is concentrated"
          icon={<MapPin size={16} color="#5B4FCF" />}
          iconBg="rgba(91,79,207,0.1)"
          rows={byCity}
        />
        <BreakdownCard
          title="Profit by Channel"
          subtitle="Which sales channels perform best"
          icon={<Radio size={16} color="#5B4FCF" />}
          iconBg="rgba(91,79,207,0.1)"
          rows={byChannel}
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={16} color="#D94040" />
          <h3 className="text-sm font-bold" style={{ color: '#0F1F3D' }}>Product Return Breakdown</h3>
        </div>
        <SKUReturnTable />
      </div>
    </div>
  );
}
