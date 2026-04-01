import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase'; 
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import Receipt from './Receipt'; // 👈 Import Receipt
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../utils/auditLogger';

const OrderList = () => {
  const { currentUser, workspaceId, userRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [receiptOrder, setReceiptOrder] = useState(null); // 👈 For receipt modal
  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

  // 1. 🔄 FETCH DATA
  useEffect(() => {
    if (!effectiveWorkspaceId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    
    const q = query(
      collection(db, "orders"), 
      where("workspaceId", "==", effectiveWorkspaceId), 
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveWorkspaceId]);

  // 2. 🟢 STATUS CHANGER (Pending -> Delivered -> Returned)
  const handleStatusChange = async (id, newStatus) => {
    const orderRef = doc(db, "orders", id);
    await updateDoc(orderRef, {
      status: newStatus
    });

    if (currentUser) {
      try {
        await logAudit(
          currentUser.workspaceId,
          currentUser,
          'UPDATED_ORDER',
          `Updated order status: ${id} -> ${newStatus}`
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  // 3. 🗑️ DELETE FUNCTION
  const handleDelete = async (id) => {
    if (userRole !== 'owner') {
      alert('Only owners can delete orders.');
      return;
    }

    if(window.confirm("Are you sure you want to delete this order permanently?")) {
        await deleteDoc(doc(db, "orders", id));

        if (currentUser) {
          try {
            await logAudit(
              currentUser.workspaceId,
              currentUser,
              'DELETED_ORDER',
              `Deleted order: ${id}`
            );
          } catch (err) {
            console.error(err);
          }
        }
    }
  };

  // 4. 💰 PROFIT CALCULATION ENGINE
  const getStableProfit = (order) => {
    const qty = Number(order.qty || order.quantity || 1);
    const grossRevenue = Number(order.grossRevenue ?? order.totalRevenue ?? order.sellingPrice ?? 0);
    const totalProductCost = Number(order.totalProductCost ?? order.productCost ?? 0);
    const totalPackaging = Number(order.totalPackaging ?? (Number(order.unitPackaging || 0) * qty));
    const totalAdSpend = Number(order.totalAdSpend ?? (Number(order.adCost || 0) * qty));
    const totalDelivery = Number(order.totalDelivery ?? order.deliveryCost ?? 0);
    const totalDiscount = Number(order.totalDiscount ?? (Number(order.unitDiscount ?? order.discountPrice ?? 0) * qty));
    const totalDeductions = Number(order.totalDeductions ?? (totalProductCost + totalPackaging + totalAdSpend + totalDelivery));
    const trueProfit = Number(order.trueNetProfit ?? order.finalProfit ?? order.netProfit ?? (grossRevenue - totalDeductions));

    const unitCost = Number(order.unitCost ?? (qty > 0 ? totalProductCost / qty : 0));
    const unitSellingPrice = Number(order.unitSellingPrice ?? (qty > 0 ? (grossRevenue + totalDiscount) / qty : 0));
    const unitDiscount = Number(order.unitDiscount ?? order.discountPrice ?? (qty > 0 ? totalDiscount / qty : 0));
    const unitPackaging = Number(order.unitPackaging ?? (qty > 0 ? totalPackaging / qty : 0));

    return {
      qty,
      grossRevenue,
      totalDiscount,
      totalProductCost,
      totalPackaging,
      totalAdSpend,
      totalDelivery,
      totalDeductions,
      trueProfit,
      unitCost,
      unitSellingPrice,
      unitDiscount,
      unitPackaging
    };
  };

  const formatSignedCurrency = (value) => {
    const num = Number(value || 0);
    const sign = num < 0 ? '-' : '';
    return `${sign}Tk${Math.abs(num).toFixed(0)}`;
  };

  // 5. 📄 SECURE EXPORT TO EXCEL
  const handleExport = () => {
    const isConfirmed = window.confirm(
        "⚠️ SECURITY WARNING ⚠️\n\n" +
        "This file contains sensitive customer personal data.\n" +
        "Do NOT download this on a public computer (Printing Shop, Cyber Cafe).\n\n" +
        "Are you sure you want to download?"
    );

    if (!isConfirmed) return;

    const excelData = orders.map(order => {
      const {
        qty,
        trueProfit,
        grossRevenue,
        totalDiscount,
        totalProductCost,
        totalPackaging,
        totalAdSpend,
        totalDelivery,
        totalDeductions
      } = getStableProfit(order);
      return {
        Date: order.timestamp?.toDate().toLocaleDateString('en-GB') || "N/A",
        Customer: order.name,
        Qty: qty,
        Phone: order.phone,
        Address: order.address,
        Category: order.category || "",
        Subcategory: order.subcategory || "",
        SKU: order.sku || "",
        Status: order.status || "Pending",
        "Gross Revenue": grossRevenue,
        "Total Discount": totalDiscount,
        "Total Product Cost": totalProductCost,
        "Total Packaging": totalPackaging,
        "Total Ad Spend": totalAdSpend,
        "Total Delivery": totalDelivery,
        "Total Deductions": totalDeductions,
        "Net Profit": trueProfit.toFixed(2)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Profit Report");
    XLSX.writeFile(workbook, "Profit_Optimizer_Report.xlsx");
  };

  if (loading) {
    return (
      <div className="text-center p-10 text-gray-500">
        <p className="text-xl">⏳ Loading Orders...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center p-10 text-yellow-600 bg-yellow-50 rounded-lg">
        <p>📍 Please login to see orders</p>
      </div>
    );
  }

  const selectedOrderProfit = selectedOrder ? getStableProfit(selectedOrder) : null;

  return (
    <div className="mt-10 w-full relative">

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          
          {/* HEADER */}
          <div className="flex justify-between items-end mb-6 border-b pb-4">
            <div>
               <h2 className="text-2xl font-bold text-gray-800">📊 Profit Dashboard</h2>
               <p className="text-xs text-gray-400">Real-time calculations based on saved data.</p>
            </div>
            <button 
              onClick={handleExport}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 shadow-md flex items-center gap-2 transition"
            >
              <span>📄</span> Export Excel
            </button>
          </div>
          
          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Net Profit</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {orders.map((order) => {
                   const { trueProfit } = getStableProfit(order);
                   return (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-blue-50 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {order.timestamp?.toDate().toLocaleDateString('en-GB') || "N/A"}
                      </td>
                      
                      <td className="py-3 px-4 font-medium">
                        {order.name}<br/>
                        <span className="text-xs text-gray-400">{order.phone}</span>
                      </td>

                      {/* STATUS DROPDOWN */}
                      <td className="py-3 px-4 text-center">
                        <select 
                            value={order.status || 'Pending'} 
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`text-xs font-bold px-2 py-1 rounded-full border-none outline-none cursor-pointer
                            ${(order.status === 'Delivered') ? 'bg-green-100 text-green-800' : ''}
                            ${(order.status === 'Returned') ? 'bg-red-100 text-red-800' : ''}
                            ${(!order.status || order.status === 'Pending') ? 'bg-yellow-100 text-yellow-800' : ''}
                            `}
                        >
                            <option value="Pending">Pending</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Returned">Returned</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${trueProfit > 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatSignedCurrency(trueProfit)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center flex gap-2 justify-center">
                        {/* ANALYZE BUTTON */}
                        <button 
                          onClick={() => setSelectedOrder(order)} 
                          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold hover:bg-blue-200"
                        >
                          🔍
                        </button>
                        {/* RECEIPT BUTTON */}
                        <button 
                          onClick={() => setReceiptOrder(order)} 
                          className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-bold hover:bg-purple-200"
                          title="Print/Download Receipt"
                        >
                          🧾
                        </button>
                        {/* DELETE BUTTON */}
                        {userRole === 'owner' && (
                          <button 
                            onClick={() => handleDelete(order.id)} 
                            className="bg-red-50 text-red-500 px-3 py-1 rounded text-xs font-bold hover:bg-red-100"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* RECEIPT MODAL */}
          {receiptOrder && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-bounce-in relative">
                <button 
                  onClick={() => setReceiptOrder(null)} 
                  className="absolute top-2 right-2 z-10 bg-red-500 text-white w-8 h-8 rounded-full hover:bg-red-600 font-bold"
                >
                  ✕
                </button>
                <Receipt order={{
                  id: receiptOrder.id,
                  customerName: receiptOrder.name,
                  phone: receiptOrder.phone,
                  address: receiptOrder.address,
                  items: [{
                    name: receiptOrder.category
                      ? `${receiptOrder.category}${receiptOrder.subcategory ? ` • ${receiptOrder.subcategory}` : ''}`
                      : 'Product',
                    price: parseFloat(receiptOrder.productCost) || 0
                  }],
                  sellingPrice: parseFloat(receiptOrder.sellingPrice) || 0,
                  discountPrice: parseFloat(receiptOrder.discountPrice) || 0,
                  category: receiptOrder.category || "",
                  subcategory: receiptOrder.subcategory || "",
                  sku: receiptOrder.sku || "",
                  totalPrice: parseFloat(receiptOrder.sellingPrice) || 0,
                  date: receiptOrder.timestamp?.toDate().toLocaleDateString('en-GB') || new Date().toLocaleDateString('en-GB'),
                  deliveryCost: receiptOrder.deliveryCost,
                  adCost: receiptOrder.adCost,
                  netProfit: getStableProfit(receiptOrder).trueProfit
                }} />
              </div>
            </div>
          )}

          {/* POPUP MODAL (AUTOPSY) */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-bounce-in">
                <div className="bg-slate-800 p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-lg">💰 Profit Autopsy</h3>
                    {selectedOrderProfit?.qty > 1 && (
                      <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                        [Batch Order: {selectedOrderProfit.qty} Items]
                      </span>
                    )}
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-500">Order for {selectedOrder.name}</p>
                    <h2 className={`text-4xl font-bold ${selectedOrderProfit?.trueProfit > 0 ? "text-green-600" : "text-red-500"}`}>
                      {formatSignedCurrency(selectedOrderProfit?.trueProfit)}
                    </h2>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">True Net Profit</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Selling Price</span>
                      <span className="font-bold">{selectedOrderProfit?.grossRevenue || 0} Tk</span>
                    </div>
                    {Number(selectedOrderProfit?.totalDiscount || 0) > 0 && (
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-600">Discount</span>
                        <span className="font-bold">- {selectedOrderProfit?.totalDiscount || 0} Tk</span>
                      </div>
                    )}
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between text-red-500">
                        <span>📦 Product Cost</span>
                        <span>- {selectedOrderProfit?.totalProductCost || 0}</span>
                      </div>
                      <div className="flex justify-between text-red-500">
                        <span>🚚 Delivery</span>
                        <span>- {selectedOrderProfit?.totalDelivery || 0}</span>
                      </div>
                      <div className="flex justify-between text-blue-600 font-bold bg-blue-100 p-1 rounded">
                        <span>📢 Ad Spend</span>
                        <span>- {selectedOrderProfit?.totalAdSpend || 0}</span>
                      </div>
                      <div className="flex justify-between text-orange-500 font-medium">
                        <span>🏷️ Packaging</span>
                        <span>- {selectedOrderProfit?.totalPackaging || 0}</span>
                      </div>
                    </div>
                    <div className="flex justify-between pt-2 font-bold text-gray-800">
                      <span>Total Deductions</span>
                      <span>- {selectedOrderProfit?.totalDeductions?.toFixed(0)} Tk</span>
                    </div>
                    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer font-semibold text-slate-700">View Unit Breakdown</summary>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <div>Unit Cost: {selectedOrderProfit?.unitCost?.toFixed(2)} Tk</div>
                        <div>Unit Selling Price: {selectedOrderProfit?.unitSellingPrice?.toFixed(2)} Tk</div>
                        <div>Unit Discount: {selectedOrderProfit?.unitDiscount?.toFixed(2)} Tk</div>
                        <div>Unit Packaging: {selectedOrderProfit?.unitPackaging?.toFixed(2)} Tk</div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default OrderList;