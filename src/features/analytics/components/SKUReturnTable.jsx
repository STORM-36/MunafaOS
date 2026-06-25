import React, { useState } from 'react';
import { Package, ChevronUp, ChevronDown } from 'lucide-react';
import { useReturnAnalytics } from '../hooks/useReturnAnalytics';

export default function SKUReturnTable() {
  const { loading, skuReturnData } = useReturnAnalytics();
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div
        className="bg-white rounded-2xl p-5 shadow-sm animate-pulse"
        style={{ border: '1px solid rgba(15,31,61,0.09)', height: '160px' }}
      />
    );
  }

  if (skuReturnData.length === 0) {
    return (
      <div
        className="bg-white rounded-2xl p-5 shadow-sm"
        style={{ border: '1px solid rgba(15,31,61,0.09)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Package size={16} color="#0F1F3D" />
          <p className="text-sm font-bold" style={{ color: '#0F1F3D' }}>
            Product Return Breakdown
          </p>
        </div>
        <p className="text-sm text-center py-4" style={{ color: 'rgba(15,31,61,0.45)' }}>
          No return data yet
        </p>
      </div>
    );
  }

  const visibleData = showAll ? skuReturnData : skuReturnData.slice(0, 5);

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      style={{ border: '1px solid rgba(15,31,61,0.09)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(15,31,61,0.09)' }}
      >
        <div className="flex items-center gap-2">
          <Package size={16} color="#0F1F3D" />
          <p className="text-sm font-bold" style={{ color: '#0F1F3D' }}>
            Product Return Breakdown
          </p>
        </div>
        <p className="text-xs" style={{ color: 'rgba(15,31,61,0.45)' }}>
          Sorted by return rate
        </p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#F6F8FC' }}>
            <th
              className="text-left px-5 py-2 text-xs font-semibold"
              style={{ color: 'rgba(15,31,61,0.55)' }}
            >
              Product
            </th>
            <th
              className="text-center px-3 py-2 text-xs font-semibold"
              style={{ color: 'rgba(15,31,61,0.55)' }}
            >
              Orders
            </th>
            <th
              className="text-center px-3 py-2 text-xs font-semibold"
              style={{ color: 'rgba(15,31,61,0.55)' }}
            >
              Returned
            </th>
            <th
              className="text-right px-5 py-2 text-xs font-semibold"
              style={{ color: 'rgba(15,31,61,0.55)' }}
            >
              Return Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleData.map((sku, i) => {
            const rate = Number(sku.returnRate);
            const rateColor =
              rate < 10 ? '#1A9E6A' :
              rate <= 20 ? '#E8B84B' : '#D94040';
            const rateBg =
              rate < 10 ? 'rgba(26,158,106,0.08)' :
              rate <= 20 ? 'rgba(232,184,75,0.08)' :
              'rgba(217,64,64,0.08)';

            return (
              <tr key={i} style={{ borderBottom: '1px solid rgba(15,31,61,0.06)' }}>
                <td
                  className="px-5 py-3 font-medium text-xs"
                  style={{
                    color: '#0F1F3D',
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sku.productName}
                </td>
                <td
                  className="text-center px-3 py-3 text-xs"
                  style={{ color: 'rgba(15,31,61,0.65)' }}
                >
                  {sku.totalOrders}
                </td>
                <td
                  className="text-center px-3 py-3 text-xs"
                  style={{ color: 'rgba(15,31,61,0.65)' }}
                >
                  {sku.returnedOrders}
                </td>
                <td className="text-right px-5 py-3">
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ color: rateColor, background: rateBg }}
                  >
                    {sku.returnRate}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {skuReturnData.length > 5 && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          className="w-full py-2 text-xs font-semibold flex items-center justify-center gap-1"
          style={{
            color: 'rgba(15,31,61,0.55)',
            borderTop: '1px solid rgba(15,31,61,0.09)',
          }}
        >
          {showAll
            ? <><ChevronUp size={13} /> Show less</>
            : <><ChevronDown size={13} /> Show all {skuReturnData.length} products</>
          }
        </button>
      )}
    </div>
  );
}
