import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase'; 
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import Receipt from './Receipt'; // 👈 Import Receipt
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../utils/auditLogger';

const PAGE_SIZE = 20;

const OrderList = ({ onOpenNewOrder }) => {
  const { currentUser, workspaceId, userRole } = useAuth();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [receiptOrder, setReceiptOrder] = useState(null); // 👈 For receipt modal
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRange, setDateRange] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;



  const filteredOrders = useMemo(() => {
    let result = [...allOrders];

    // Apply status filter
    if (statusFilter !== "All") {
      result = result.filter(order => {
        const s = order.status || "Pending";
        return s === statusFilter;
      });
    }

    // Apply search text
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      result = result.filter(order =>
        (order.name || "").toLowerCase().includes(s) ||
        (order.phone || "").toLowerCase().includes(s) ||
        (order.productName || "").toLowerCase().includes(s)
      );
    }

    // Apply date range filter
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999);

      result = result.filter((order) => {
        if (!order.timestamp) return false;
        const orderDate = order.timestamp.toDate
          ? order.timestamp.toDate()
          : new Date(order.timestamp);
        return orderDate >= from &&
               orderDate <= to;
      });
    }

    if (dateRange !== "All") {
      const now = new Date();
      const startOf = (unit) => {
        const d = new Date();
        if (unit === "today") {
          d.setHours(0, 0, 0, 0);
        } else if (unit === "week") {
          d.setDate(d.getDate() - 7);
          d.setHours(0, 0, 0, 0);
        } else if (unit === "month") {
          d.setDate(d.getDate() - 30);
          d.setHours(0, 0, 0, 0);
        }
        return d;
      };

      const cutoff = dateRange === "Today"
        ? startOf("today")
        : dateRange === "Week"
        ? startOf("week")
        : startOf("month");

      result = result.filter((order) => {
        if (!order.timestamp) return false;
        const orderDate = order.timestamp.toDate
          ? order.timestamp.toDate()
          : new Date(order.timestamp);
        return orderDate >= cutoff;
      });
    }

    return result;
  }, [allOrders, statusFilter, searchText, dateRange, customFrom, customTo]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const pagedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchText, dateRange, customFrom, customTo]);

  const summaryStats = useMemo(() => {
    const isFiltered =
      searchText.trim() !== "" ||
      statusFilter !== "All" ||
      dateRange !== "All" ||
      (customFrom !== "" && customTo !== "");

    const source = isFiltered ? filteredOrders : allOrders;

    const totalOrders = source.length;

    const totalRevenue = source.reduce(
      (sum, order) =>
        sum +
        (parseFloat(order.totalRevenue) ||
         parseFloat(order.grossRevenue) || 0),
      0
    );

    const totalProfit = source.reduce(
      (sum, order) =>
        sum +
        (parseFloat(order.trueNetProfit) ||
         parseFloat(order.finalProfit) ||
         parseFloat(order.netProfit) || 0),
      0
    );

    const pendingOrders = source.filter(
      (order) => !order.status || order.status === "Pending"
    ).length;

    const formatDateLabel = (dateStr) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    };

    const label = !isFiltered ? "All time" :
      (customFrom && customTo)
        ? `${formatDateLabel(customFrom)} - ${formatDateLabel(customTo)}` :
      dateRange === "Today" ? "Today" :
      dateRange === "Week" ? "This week" :
      dateRange === "Month" ? "This month" :
      statusFilter !== "All" ? statusFilter :
      "Filtered";

    return { totalOrders, totalRevenue, totalProfit, pendingOrders, isFiltered, label };
  }, [allOrders, filteredOrders, searchText, statusFilter, dateRange, customFrom, customTo]);

  // 1. 🔄 FETCH ALL ORDERS (no limit) for real-time updates
  useEffect(() => {
    if (!effectiveWorkspaceId) {
      setAllOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "orders"),
      where("workspaceId", "==", effectiveWorkspaceId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const ordersData = snapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() })
        );
        setAllOrders(ordersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching orders:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [effectiveWorkspaceId]);

  // 2. 🟢 STATUS CHANGER (Pending -> Delivered -> Returned)
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus
      });

      // Update allOrders state locally to avoid re-fetch
      setAllOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));

      if (currentUser) {
        try {
          await logAudit(
            currentUser.workspaceId,
            currentUser,
            'UPDATED_ORDER',
            `Updated order status: ${orderId} -> ${newStatus}`
          );
        } catch (err) {
          console.error(err);
        }
      }
    } catch (error) {
      console.error("Error updating order status:", error);
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
    return `${sign}৳${Math.abs(num).toFixed(0)}`;
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

    const excelData = filteredOrders.map(order => {
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

  const statusMeta = {
    Delivered: {
      bg: 'bg-[#E6F7EF]',
      text: 'text-[#0D7A4E]',
      dot: 'bg-[#0D7A4E]'
    },
    Pending: {
      bg: 'bg-[#FFF8E6]',
      text: 'text-[#9A6F00]',
      dot: 'bg-[#9A6F00]'
    },
    Shipped: {
      bg: 'bg-[#EBF1FF]',
      text: 'text-[#2E5BA8]',
      dot: 'bg-[#2E5BA8]'
    },
    Returned: {
      bg: 'bg-[#FEF0F0]',
      text: 'text-[#9A2E2E]',
      dot: 'bg-[#9A2E2E]'
    }
  };

  const avgOrderValue = filteredOrders.length ? summaryStats.totalRevenue / filteredOrders.length : 0;
  const profitMargin = summaryStats.totalRevenue ? (summaryStats.totalProfit / summaryStats.totalRevenue) * 100 : 0;
  const statusCounts = {
    total: filteredOrders.length,
    pending: filteredOrders.filter((o) => !o.status || o.status === 'Pending').length,
    shipped: filteredOrders.filter((o) => o.status === 'Shipped').length,
    delivered: filteredOrders.filter((o) => o.status === 'Delivered').length,
    returned: filteredOrders.filter((o) => o.status === 'Returned').length
  };

  return (
    <div id="orders-list-top" className="w-full relative font-sans text-[#0F1F3D]">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
        <div className="rounded-xl border border-[rgba(15,31,61,0.09)] bg-[#F0F4FF] px-4 py-3">
          <p className="text-[11px] font-bold text-[#0F1F3D]">Total Orders</p>
          <p className="text-2xl font-extrabold text-[#0F1F3D] leading-tight">{summaryStats.totalOrders}</p>
        </div>
        <div className="rounded-xl border border-[rgba(15,31,61,0.09)] bg-[#FFF8E6] px-4 py-3">
          <p className="text-[11px] font-bold text-[#9A6F00]">Pending</p>
          <p className="text-2xl font-extrabold text-[#9A6F00] leading-tight">{statusCounts.pending}</p>
        </div>
        <div className="rounded-xl border border-[rgba(15,31,61,0.09)] bg-[#EBF1FF] px-4 py-3">
          <p className="text-[11px] font-bold text-[#2E5BA8]">Shipped</p>
          <p className="text-2xl font-extrabold text-[#2E5BA8] leading-tight">{statusCounts.shipped}</p>
        </div>
        <div className="rounded-xl border border-[rgba(15,31,61,0.09)] bg-[#E6F7EF] px-4 py-3">
          <p className="text-[11px] font-bold text-[#1A9E6A]">Delivered</p>
          <p className="text-2xl font-extrabold text-[#1A9E6A] leading-tight">{statusCounts.delivered}</p>
        </div>
        <div className="rounded-xl border border-[rgba(15,31,61,0.09)] bg-[#FEF0F0] px-4 py-3">
          <p className="text-[11px] font-bold text-[#D94040]">Returned</p>
          <p className="text-2xl font-extrabold text-[#D94040] leading-tight">{statusCounts.returned}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <div className="rounded-[10px] border border-[rgba(15,31,61,0.09)] bg-white px-4 py-3">
          <p className="text-[9px] uppercase tracking-wider font-bold text-[#6D7690]">Total Revenue</p>
          <p className="text-[19px] font-extrabold text-[#0F1F3D]">৳{summaryStats.totalRevenue.toFixed(0)}</p>
        </div>
        <div className="rounded-[10px] border border-[rgba(15,31,61,0.09)] bg-white px-4 py-3">
          <p className="text-[9px] uppercase tracking-wider font-bold text-[#6D7690]">Net Profit</p>
          <p className="text-[19px] font-extrabold text-[#1A9E6A]">৳{summaryStats.totalProfit.toFixed(0)}</p>
        </div>
        <div className="rounded-[10px] border border-[rgba(15,31,61,0.09)] bg-white px-4 py-3">
          <p className="text-[9px] uppercase tracking-wider font-bold text-[#6D7690]">Avg Order Value</p>
          <p className="text-[19px] font-extrabold text-[#0F1F3D]">৳{avgOrderValue.toFixed(0)}</p>
        </div>
        <div className="rounded-[10px] border border-[rgba(15,31,61,0.09)] bg-white px-4 py-3">
          <p className="text-[9px] uppercase tracking-wider font-bold text-[#6D7690]">Profit Margin</p>
          <p className="text-[19px] font-extrabold text-[#0F1F3D]">{profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(15,31,61,0.09)] bg-white p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6D7690] text-sm">🔍</span>
            <input
              type="text"
              className="w-full h-10 rounded-lg border border-[rgba(15,31,61,0.12)] bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#2E5BA8]/20"
              placeholder="Search by customer, phone or product"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="h-10 rounded-lg border border-[rgba(15,31,61,0.12)] px-3 text-sm bg-white"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Returned">Returned</option>
          </select>

          <div className="h-10 rounded-full bg-[#F6F8FC] border border-[rgba(15,31,61,0.09)] p-1 flex items-center gap-1">
            {[
              { key: 'All', label: 'All' },
              { key: 'Today', label: 'Today' },
              { key: 'Week', label: '7d' },
              { key: 'Month', label: '30d' }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setDateRange(item.key);
                  setCurrentPage(1);
                }}
                className={`h-8 px-3 rounded-full text-xs font-bold transition ${
                  dateRange === item.key
                    ? 'bg-white shadow text-[#0F1F3D]'
                    : 'bg-transparent text-[#6D7690]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="h-10 rounded-lg border border-[rgba(15,31,61,0.12)] px-3 text-sm font-semibold text-[#0F1F3D]"
          >
            Filters
          </button>
          <button
            onClick={handleExport}
            className="h-10 rounded-lg border border-[rgba(15,31,61,0.12)] px-3 text-sm font-semibold text-[#0F1F3D]"
          >
            Export
          </button>
          <button
            onClick={() => onOpenNewOrder?.()}
            className="h-10 rounded-lg bg-[#0F1F3D] text-[#E8B84B] px-4 text-sm font-bold"
          >
            + New Order
          </button>
        </div>

        {showFilters && (
          <div style={{
            background: '#EBF1FF',
            border: '1px solid #B8CEEE',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '14px',
            marginTop: '12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px'
          }}>
            <div>
              <label style={{ fontSize: '9px',
                fontWeight: 700, color: '#2E5BA8',
                letterSpacing: '.8px',
                textTransform: 'uppercase',
                display: 'block', marginBottom: '4px'
              }}>From Date</label>
              <input type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setDateRange("All");
                  setCurrentPage(1);
                }}
                style={{ width: '100%', padding: '8px 10px',
                  borderRadius: '7px',
                  border: '1px solid rgba(15,31,61,0.09)',
                  fontSize: '12px', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '9px',
                fontWeight: 700, color: '#2E5BA8',
                letterSpacing: '.8px',
                textTransform: 'uppercase',
                display: 'block', marginBottom: '4px'
              }}>To Date</label>
              <input type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setDateRange("All");
                  setCurrentPage(1);
                }}
                style={{ width: '100%', padding: '8px 10px',
                  borderRadius: '7px',
                  border: '1px solid rgba(15,31,61,0.09)',
                  fontSize: '12px', outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex',
              alignItems: 'flex-end' }}>
              <button
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                  setCurrentPage(1);
                  setShowFilters(false);
                }}
                style={{ width: '100%', padding: '8px',
                  borderRadius: '7px',
                  border: '1px solid rgba(15,31,61,0.09)',
                  background: '#fff', fontSize: '12px',
                  fontWeight: 600, color: '#4A6080',
                  cursor: 'pointer'
                }}
              >
                ✕ Clear Filters
              </button>
            </div>
          </div>
        )}

      </div>

      <div className="rounded-xl border border-[rgba(15,31,61,0.09)] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-[#F6F8FC] text-[#6D7690] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">SL</th>
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Net Profit</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {pagedOrders.map((order, index) => {
                const { trueProfit, qty } = getStableProfit(order);
                const status = order.status || 'Pending';
                const statusStyle = statusMeta[status] || statusMeta.Pending;
                const orderDate = order.timestamp?.toDate?.() || null;
                const serialNumber =
                  (currentPage - 1) * PAGE_SIZE + index + 1;
                const orderCode = `#${String((currentPage - 1) * PAGE_SIZE + index + 1).padStart(3, '0')}`;
                return (
                  <tr key={order.id} className="border-b border-[rgba(15,31,61,0.06)] hover:bg-[#F9FBFF]">
                    <td className="py-3 px-3 font-mono text-[11px] font-bold text-[#4A6080]">{serialNumber}</td>
                    <td className="py-3 px-3 font-mono text-[11px] font-bold text-[#5B4FCF]">{orderCode}</td>
                    <td className="py-3 px-3 text-[11px] text-[#6D7690]">
                      <p>{orderDate ? orderDate.toLocaleDateString('en-GB') : 'N/A'}</p>
                      <p>{orderDate ? orderDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-[12px] font-bold text-[#0F1F3D] leading-tight">{order.name || 'Unknown'}</p>
                      <p className="text-[10px] text-[#6D7690] mt-0.5">{order.phone || 'No phone'}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center rounded-lg border border-[rgba(15,31,61,0.09)] bg-[#F6F8FC] px-2 py-1 text-[10px] font-semibold text-[#0F1F3D]">
                        {order.productName || order.category || 'Product'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-[#0F1F3D]">{qty}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="relative inline-flex items-center">
                        <span className={`absolute left-2 h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                        <select
                          value={status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`h-8 pl-5 pr-6 rounded-full text-[11px] font-bold border-0 ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Returned">Returned</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-extrabold ${trueProfit >= 0 ? 'text-[#1A9E6A]' : 'text-[#D94040]'}`}>
                        {formatSignedCurrency(trueProfit)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="h-[26px] w-[26px] rounded-md border border-[rgba(15,31,61,0.15)] text-[13px]"
                          title="Profit Autopsy"
                        >
                          🔍
                        </button>
                        <button
                          onClick={() => setReceiptOrder(order)}
                          className="h-[26px] w-[26px] rounded-md border border-[rgba(15,31,61,0.15)] text-[13px]"
                          title="Receipt"
                        >
                          🧾
                        </button>
                        {userRole === 'owner' && (
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="h-[26px] w-[26px] rounded-md border border-[rgba(15,31,61,0.15)] text-[13px]"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 p-4 bg-[#F6F8FC] border-t border-[rgba(15,31,61,0.09)]">
          <span className="text-xs text-[#8BA0BC]">
            {`Showing ${filteredOrders.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
              currentPage * PAGE_SIZE,
              filteredOrders.length
            )} of ${filteredOrders.length} orders`}
          </span>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-[rgba(15,31,61,0.12)] bg-white disabled:opacity-40 text-sm font-medium text-[#4A6080]"
            >
              ← Prev
            </button>

            <span className="text-sm font-medium text-[#0F1F3D]">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 rounded border border-[rgba(15,31,61,0.12)] bg-white disabled:opacity-40 text-sm font-medium text-[#4A6080]"
            >
              Next →
            </button>
          </div>
        </div>
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
                      <span className="font-bold">{selectedOrderProfit?.grossRevenue || 0} ৳</span>
                    </div>
                    {Number(selectedOrderProfit?.totalDiscount || 0) > 0 && (
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-600">Discount</span>
                        <span className="font-bold">- {selectedOrderProfit?.totalDiscount || 0} ৳</span>
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
                      <span>- {selectedOrderProfit?.totalDeductions?.toFixed(0)} ৳</span>
                    </div>
                    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer font-semibold text-slate-700">View Unit Breakdown</summary>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <div>Unit Cost: {selectedOrderProfit?.unitCost?.toFixed(2)} ৳</div>
                        <div>Unit Selling Price: {selectedOrderProfit?.unitSellingPrice?.toFixed(2)} ৳</div>
                        <div>Unit Discount: {selectedOrderProfit?.unitDiscount?.toFixed(2)} ৳</div>
                        <div>Unit Packaging: {selectedOrderProfit?.unitPackaging?.toFixed(2)} ৳</div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  );
};

export default OrderList;