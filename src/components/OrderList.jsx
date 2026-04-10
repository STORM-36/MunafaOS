import React, { useEffect, useMemo, useState } from 'react';
import { db, auth } from '../firebase'; 
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, limit, startAfter, getCountFromServer } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import Receipt from './Receipt'; // 👈 Import Receipt
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../utils/auditLogger';

const PAGE_SIZE = 20;

const OrderList = () => {
  const { currentUser, workspaceId, userRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [receiptOrder, setReceiptOrder] = useState(null); // 👈 For receipt modal
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRange, setDateRange] = useState("All");
  const [totalCount, setTotalCount] = useState(0);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [allTimeStats, setAllTimeStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProfit: 0,
    pendingOrders: 0
  });
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

  const filteredOrders = useMemo(() => {
    let result = [...orders];

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

    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter((order) =>
        (order.name || "").toLowerCase().includes(search) ||
        (order.phone || "").toLowerCase().includes(search) ||
        (order.productName || "").toLowerCase().includes(search)
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((order) => {
        const effectiveStatus = order.status || "Pending";
        return effectiveStatus === statusFilter;
      });
    }

    return result;
  }, [orders, searchText, statusFilter, dateRange, customFrom, customTo]);

  const summaryStats = useMemo(() => {
    const isFiltered =
      searchText.trim() !== "" ||
      statusFilter !== "All" ||
      dateRange !== "All" ||
      (customFrom !== "" && customTo !== "");

    if (!isFiltered) {
      return {
        totalOrders: allTimeStats.totalOrders,
        totalRevenue: allTimeStats.totalRevenue,
        totalProfit: allTimeStats.totalProfit,
        pendingOrders: allTimeStats.pendingOrders,
        isFiltered: false,
        label: "All time"
      };
    }

    const totalOrders = filteredOrders.length;

    const totalRevenue = filteredOrders.reduce(
      (sum, order) =>
        sum +
        (parseFloat(order.totalRevenue) ||
         parseFloat(order.grossRevenue) || 0),
      0
    );

    const totalProfit = filteredOrders.reduce(
      (sum, order) =>
        sum +
        (parseFloat(order.trueNetProfit) ||
         parseFloat(order.finalProfit) ||
         parseFloat(order.netProfit) || 0),
      0
    );

    const pendingOrders = filteredOrders.filter(
      (order) =>
        !order.status ||
        order.status === "Pending"
    ).length;

    const formatDateLabel = (dateStr) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit", month: "short"
      });
    };

    const label =
      (customFrom && customTo)
        ? `${formatDateLabel(customFrom)} -
       ${formatDateLabel(customTo)}` :
      dateRange === "Today" ? "Today" :
      dateRange === "Week" ? "This week" :
      dateRange === "Month" ? "This month" :
      statusFilter !== "All" ? statusFilter :
      "Filtered";

    return {
      totalOrders,
      totalRevenue,
      totalProfit,
      pendingOrders,
      isFiltered: true,
      label
    };
  }, [filteredOrders, allTimeStats,
      searchText, statusFilter,
      dateRange, customFrom, customTo]);

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
      orderBy("timestamp", "desc"),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const ordersData = snapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() })
        );
        setOrders(ordersData);
        setLastVisibleDoc(
          snapshot.docs[
            snapshot.docs.length - 1
          ] || null
        );
        setHasMore(
          snapshot.docs.length === PAGE_SIZE
        );
        setLoading(false);

        if (!effectiveWorkspaceId) return;
        const countQuery = query(
          collection(db, "orders"),
          where("workspaceId", "==",
            effectiveWorkspaceId)
        );
        getCountFromServer(countQuery)
          .then((snap) =>
            setTotalCount(snap.data().count))
          .catch(() => {});

        fetchAllTimeStats();
      }
    );

    return () => unsubscribe();
  }, [effectiveWorkspaceId]);

  useEffect(() => {
    if (!effectiveWorkspaceId) return;
    const countQuery = query(
      collection(db, "orders"),
      where("workspaceId", "==", effectiveWorkspaceId)
    );
    getCountFromServer(countQuery)
      .then((snap) => setTotalCount(snap.data().count))
      .catch(() => setTotalCount(0));
  }, [effectiveWorkspaceId]);

  const fetchAllTimeStats = async () => {
    if (!effectiveWorkspaceId) return;
    try {
      const allOrdersQuery = query(
        collection(db, "orders"),
        where("workspaceId", "==", effectiveWorkspaceId)
      );
      const snapshot = await getDocs(allOrdersQuery);
      const allOrders = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() })
      );

      const totalOrders = allOrders.length;

      const totalRevenue = allOrders.reduce(
        (sum, order) =>
          sum +
          (parseFloat(order.totalRevenue) ||
           parseFloat(order.grossRevenue) ||
           0),
        0
      );

      const totalProfit = allOrders.reduce(
        (sum, order) =>
          sum +
          (parseFloat(order.trueNetProfit) ||
           parseFloat(order.finalProfit) ||
           parseFloat(order.netProfit) ||
           0),
        0
      );

      const pendingOrders = allOrders.filter(
        (order) =>
          !order.status ||
          order.status === "Pending"
      ).length;

      setAllTimeStats({
        totalOrders,
        totalRevenue,
        totalProfit,
        pendingOrders
      });

      console.log("AllTimeStats fetched:", {
        totalOrders,
        totalRevenue,
        totalProfit,
        pendingOrders
      });

    } catch (error) {
      console.error(
        "Error fetching all time stats:",
        error
      );
    }
  };

  useEffect(() => {
    fetchAllTimeStats();
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

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || !lastVisibleDoc) return;
    setIsLoadingMore(true);
    setLoadMoreError("");
    try {
      const nextQ = query(
        collection(db, "orders"),
        where("workspaceId", "==", effectiveWorkspaceId),
        orderBy("timestamp", "desc"),
        startAfter(lastVisibleDoc),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(nextQ);
      const newOrders = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() })
      );
      setOrders((prev) => {
        const existingIds = new Set(
          prev.map((o) => o.id)
        );
        const unique = newOrders.filter(
          (o) => !existingIds.has(o.id)
        );
        return [...prev, ...unique];
      });
      setLastVisibleDoc(
        snapshot.docs[
          snapshot.docs.length - 1
        ] || null
      );
      setHasMore(
        snapshot.docs.length === PAGE_SIZE
      );
    } catch (error) {
      console.error("Load more error:", error);
      setLoadMoreError(
        "Could not load more orders. Try again."
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-600 font-bold uppercase mb-1">
                Total Orders
              </p>
              <p className="text-2xl font-bold text-blue-700">
                {summaryStats.totalOrders}
              </p>
              <p className="text-xs text-blue-400 mt-1">
                {summaryStats.label}
              </p>
            </div>

            <div className="bg-green-50 p-3 rounded-xl border border-green-100">
              <p className="text-xs text-green-600 font-bold uppercase mb-1">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-green-700">
                ৳{summaryStats.totalRevenue.toFixed(2)}
              </p>
              <p className="text-xs text-green-400 mt-1">
                {summaryStats.label}
              </p>
            </div>

            <div className={`p-3 rounded-xl border
              ${summaryStats.totalProfit >= 0
                ? "bg-emerald-50 border-emerald-100"
                : "bg-red-50 border-red-100"}`}>
              <p className={`text-xs font-bold
                uppercase mb-1
                ${summaryStats.totalProfit >= 0
                  ? "text-emerald-600"
                  : "text-red-600"}`}>
                Net Profit
              </p>
              <p className={`text-2xl font-bold
                ${summaryStats.totalProfit >= 0
                  ? "text-emerald-700"
                  : "text-red-700"}`}>
                ৳{summaryStats.totalProfit.toFixed(2)}
              </p>
              <p className={`text-xs mt-1
                ${summaryStats.totalProfit >= 0
                  ? "text-emerald-400"
                  : "text-red-400"}`}>
                {summaryStats.label}
              </p>
            </div>

            <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
              <p className="text-xs text-yellow-600 font-bold uppercase mb-1">
                Pending Orders
              </p>
              <p className="text-2xl font-bold text-yellow-700">
                {summaryStats.pendingOrders}
              </p>
              <p className="text-xs text-yellow-400 mt-1">
                {summaryStats.label}
              </p>
            </div>

          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase w-full mb-1">
              📅 Date Range
            </p>
            {["All", "Today", "Week", "Month"].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition border
                ${dateRange === range
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                {range === "All" ? "All Time"
                  : range === "Week" ? "This Week"
                  : range === "Month" ? "This Month"
                  : "Today"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3 mt-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                📅 From
              </label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setDateRange("All");
                }}
                className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                📅 To
              </label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setDateRange("All");
                }}
                className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {(customFrom || customTo) && (
              <button
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition"
              >
                ✕ Clear
              </button>
            )}

            {customFrom && customTo && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                📊 Custom range active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                🔍 Search Orders
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by customer, phone or product..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                📋 Filter by Status
              </label>
              <select
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Orders</option>
                <option value="Pending">Pending</option>
                <option value="Delivered">Delivered</option>
                <option value="Returned">Returned</option>
              </select>
            </div>
          </div>

          {(searchText || statusFilter !== "All" || dateRange !== "All") && (
            <p className="text-sm text-gray-500 mb-3">
              Showing{" "}
              <span className="font-bold text-gray-700">{filteredOrders.length}</span>{" "}
              of{" "}
              <span className="font-bold text-gray-700">{totalCount}</span>{" "}
              total orders
              {statusFilter !== "All" && (
                <span className="ml-1">
                  — Status:{" "}
                  <span className="font-bold text-blue-600">{statusFilter}</span>
                </span>
              )}
            </p>
          )}
          
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
                {filteredOrders.map((order) => {
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

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 mb-3">
              Showing{" "}
              <span className="font-bold text-gray-700">
                {orders.length}
              </span>{" "}
              of{" "}
              <span className="font-bold text-gray-700">
                {totalCount}
              </span>{" "}
              orders
            </p>
            {hasMore && !searchText && statusFilter === "All" && dateRange === "All" && !customFrom && !customTo && (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {isLoadingMore ? "Loading..." : "⬇️ Load More"}
              </button>
            )}
            {loadMoreError && (
              <p className="text-sm text-red-600 mt-2 font-semibold">
                ⚠️ {loadMoreError}
              </p>
            )}
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