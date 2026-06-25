import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useReturnAnalytics } from '../hooks/useReturnAnalytics';

export default function ReturnRateWidget() {
  const {
    loading,
    totalShipped,
    totalDelivered,
    totalReturned,
    successRate,
    returnRate,
    cashBurned,
  } = useReturnAnalytics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 shadow-sm animate-pulse"
            style={{ border: '1px solid rgba(15,31,61,0.09)', height: '96px' }}
          />
        ))}
      </div>
    );
  }

  if (totalShipped === 0) {
    return (
      <div
        className="bg-white rounded-2xl p-5 shadow-sm text-center"
        style={{ border: '1px solid rgba(15,31,61,0.09)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'rgba(15,31,61,0.45)' }}>
          No delivered or returned orders yet
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgba(15,31,61,0.35)' }}>
          Return analytics will appear once orders are marked Delivered or Returned
        </p>
      </div>
    );
  }

  const successColor =
    Number(successRate) >= 80 ? '#1A9E6A' :
    Number(successRate) >= 60 ? '#E8B84B' : '#D94040';

  const returnColor =
    Number(returnRate) < 10 ? '#1A9E6A' :
    Number(returnRate) <= 20 ? '#E8B84B' : '#D94040';

  const cards = [
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      valueColor: successColor,
      icon: <TrendingUp size={16} color="#1A9E6A" />,
      iconBg: 'rgba(26,158,106,0.1)',
      subtitle: `${totalDelivered} delivered of ${totalShipped} shipped`,
    },
    {
      label: 'Return Rate',
      value: `${returnRate}%`,
      valueColor: returnColor,
      icon: <TrendingDown size={16} color="#D94040" />,
      iconBg: 'rgba(217,64,64,0.1)',
      subtitle: `${totalReturned} returned of ${totalShipped} shipped`,
    },
    {
      label: 'Cash Burned on Returns',
      value: `৳${cashBurned.toLocaleString()}`,
      valueColor: cashBurned > 0 ? '#D94040' : '#0F1F3D',
      icon: <AlertTriangle size={16} color="#E8B84B" />,
      iconBg: 'rgba(232,184,75,0.1)',
      subtitle: 'ad spend + packaging + delivery lost',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(card => (
        <div
          key={card.label}
          className="bg-white rounded-2xl p-4 shadow-sm"
          style={{ border: '1px solid rgba(15,31,61,0.09)' }}
        >
          <div className="flex items-start justify-between mb-2">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'rgba(15,31,61,0.45)' }}
            >
              {card.label}
            </p>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: card.iconBg }}
            >
              {card.icon}
            </div>
          </div>
          <p className="text-2xl font-extrabold" style={{ color: card.valueColor }}>
            {card.value}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(15,31,61,0.45)' }}>
            {card.subtitle}
          </p>
        </div>
      ))}
    </div>
  );
}
