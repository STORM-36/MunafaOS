import React from 'react';
import { Package, AlertTriangle, TrendingDown, Plus, RefreshCw } from 'lucide-react';
import { useSmartStockAlerts } from '../hooks/useSmartStockAlerts';

const TAKA = '৳';

const TIER = {
  out:      { label: 'Out of Stock', color: '#D94040', bg: 'rgba(217,64,64,0.08)',   border: 'rgba(217,64,64,0.18)' },
  critical: { label: 'Critical',     color: '#E8833A', bg: 'rgba(232,131,58,0.08)',  border: 'rgba(232,131,58,0.18)' },
  low:      { label: 'Low Stock',    color: '#E8B84B', bg: 'rgba(232,184,75,0.08)',  border: 'rgba(232,184,75,0.18)' },
};

function DaysBadge({ days }) {
  if (days === null) return (
    <span className="text-[11px]" style={{ color: 'rgba(15,31,61,0.35)' }}>No sales data</span>
  );
  const color = days <= 3 ? '#D94040' : days <= 7 ? '#E8833A' : '#1A9E6A';
  const bg    = days <= 3 ? 'rgba(217,64,64,0.08)' : days <= 7 ? 'rgba(232,131,58,0.08)' : 'rgba(26,158,106,0.08)';
  return (
    <span
      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: bg }}
    >
      {days}d left
    </span>
  );
}

function TierSection({ tier, items, onAddStock }) {
  const cfg = TIER[tier];
  if (items.length === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
          style={{ color: cfg.color, background: cfg.bg }}
        >
          {cfg.label}
        </span>
        <span className="text-[11px]" style={{ color: 'rgba(15,31,61,0.35)' }}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: cfg.color + '18' }}
              >
                <Package size={14} color={cfg.color} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: '#0F1F3D' }}>
                  {item.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>
                    {item.quantity === 0 ? 'Out of stock' : `${item.quantity} left`}
                  </span>
                  {item.dailyVelocity > 0 && (
                    <span className="text-[11px]" style={{ color: 'rgba(15,31,61,0.40)' }}>
                      &middot; {item.dailyVelocity} units/day
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <DaysBadge days={item.daysUntilStockout} />
              <button
                onClick={() => onAddStock(item.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                style={{ background: '#0F1F3D', color: '#fff' }}
              >
                <Plus size={11} /> Add Stock
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SmartStockAlerts({ onAddStock }) {
  const { loading, stats, alertItems, refresh } = useSmartStockAlerts();

  if (loading) {
    return (
      <div
        className="bg-white rounded-2xl p-5 shadow-sm animate-pulse"
        style={{ border: '1px solid rgba(15,31,61,0.09)', height: '120px' }}
      />
    );
  }

  const outItems      = alertItems.filter(i => i.tier === 'out');
  const criticalItems = alertItems.filter(i => i.tier === 'critical');
  const lowItems      = alertItems.filter(i => i.tier === 'low');

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm"
      style={{ border: '1px solid rgba(15,31,61,0.09)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(217,64,64,0.10)' }}
            >
              <AlertTriangle size={16} color="#D94040" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: '#0F1F3D' }}>
              Smart Stock Alerts
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: 'rgba(15,31,61,0.45)' }}>
            {stats.outOfStockCount > 0
              ? `${stats.outOfStockCount} out of stock · ${stats.lowCriticalCount} critical`
              : stats.lowCriticalCount > 0
              ? `${stats.lowCriticalCount} items critically low`
              : 'All stock levels are healthy'}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[#F6F8FC]"
          style={{ color: 'rgba(15,31,61,0.50)', border: '1px solid rgba(15,31,61,0.09)' }}
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {alertItems.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm font-semibold" style={{ color: '#0F1F3D' }}>All stock levels healthy</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(15,31,61,0.45)' }}>
            No items below 8 units across {stats.totalProducts} products
          </p>
        </div>
      ) : (
        <>
          <TierSection tier="out"      items={outItems}      onAddStock={onAddStock} />
          <TierSection tier="critical" items={criticalItems} onAddStock={onAddStock} />
          <TierSection tier="low"      items={lowItems}      onAddStock={onAddStock} />
          <p className="text-[11px] mt-3" style={{ color: 'rgba(15,31,61,0.35)' }}>
            Velocity based on last 30 days of orders · {stats.totalProducts} total products
          </p>
        </>
      )}
    </div>
  );
}
