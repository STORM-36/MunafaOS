/* src/components/InventoryList.jsx */
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
  doc,
  limit,
  getCountFromServer,
  getDocs,
  startAfter
} from "firebase/firestore";
import { CATEGORY_OPTIONS } from "../utils/categories";
import { useAuth } from "../context/AuthContext";
import { logAudit } from "../utils/auditLogger";
import { useNavigate } from "react-router-dom";
import { Package, BarChart2, TrendingDown, TrendingUp, AlertTriangle, Search, Plus, Edit2, Trash2, Eye } from "lucide-react";

const PAGE_SIZE = 50;

const InventorySkeleton = () => (
  <div className="space-y-3 animate-pulse" role="status" aria-label="Loading inventory">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="h-12 rounded-lg bg-slate-100 border border-slate-200" />
    ))}
  </div>
);

const InventoryList = () => {
  const { currentUser, workspaceId, userRole } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [totalCount, setTotalCount] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [totalLowCritical, setTotalLowCritical] = useState(0);
  const [totalOutOfStock, setTotalOutOfStock] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [initialFetchError, setInitialFetchError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [hasTriedLoadMore, setHasTriedLoadMore] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [addStockItemId, setAddStockItemId] = useState(null);
  const [addStockQty, setAddStockQty] = useState("");
  const [addStockError, setAddStockError] = useState("");
  const [removeStockItemId, setRemoveStockItemId] = useState(null);
  const [removeStockQty, setRemoveStockQty] = useState("");
  const [removeStockReason, setRemoveStockReason] = useState("Damaged");
  const [removeStockError, setRemoveStockError] = useState("");
  const [detailItem, setDetailItem] = useState(null);

  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;
  const navigate = useNavigate();

  const fetchInventoryStats = async () => {
    if (!effectiveWorkspaceId) return;
    try {
      const allItemsSnap = await getDocs(
        query(
          collection(db, "inventory"),
          where("workspaceId", "==", effectiveWorkspaceId)
        )
      );
      const docs = allItemsSnap.docs;
      setTotalCount(docs.length);
      const totalQty = docs.reduce((sum, d) => sum + (d.data().quantity || 0), 0);
      const lowCritical = docs.filter((d) => {
        const q = d.data().quantity || 0;
        return q > 0 && q <= 5;
      }).length;
      const outOfStock = docs.filter((d) => (d.data().quantity || 0) === 0).length;
      const inventoryValue = docs.reduce(
        (sum, d) => sum + ((d.data().quantity || 0) * (d.data().buyingPrice || 0)), 0
      );
      const lowItems = docs
        .filter((d) => (d.data().quantity || 0) <= 3)
        .map((d) => ({ id: d.id, ...d.data() }));
      setTotalItemsCount(totalQty);
      setTotalLowCritical(lowCritical);
      setTotalOutOfStock(outOfStock);
      setTotalInventoryValue(inventoryValue);
      setLowStockItems(lowItems);
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
    }
  };

  useEffect(() => {
    fetchInventoryStats();
  }, [effectiveWorkspaceId, inventory.length, inventory]);

  const fetchPage = async (isInitialLoad = false) => {
    if (!effectiveWorkspaceId) {
      setLoading(false);
      return;
    }

    if (!isInitialLoad) {
      if (isLoadingMore || !hasMore) return;
      setIsLoadingMore(true);
      setLoadMoreError("");
    }

    try {
      const constraints = [
        where("workspaceId", "==", effectiveWorkspaceId),
        orderBy("timestamp", "desc"),
        limit(PAGE_SIZE)
      ];

      if (!isInitialLoad && lastVisibleDoc) {
        constraints.push(startAfter(lastVisibleDoc));
      }

      const snapshot = await getDocs(query(collection(db, "inventory"), ...constraints));
      const newItems = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      }));

      setInventory((prev) => {
        if (isInitialLoad) return newItems;

        const existingIds = new Set(prev.map((item) => item.id));
        const uniqueNew = newItems.filter((item) => !existingIds.has(item.id));
        return [...prev, ...uniqueNew];
      });

      const newLastVisibleDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setLastVisibleDoc(newLastVisibleDoc);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLoadMoreError("");
    } catch (error) {
      console.error("Error fetching inventory page:", error);
      const rawMessage = String(error?.message || "").toLowerCase();
      const missingIndex = rawMessage.includes("requires an index") || rawMessage.includes("failed-precondition");

      if (!isInitialLoad) {
        if (missingIndex) {
          setLoadMoreError("Load more needs Firestore index support. Deploy/update indexes, then retry.");
        } else {
          setLoadMoreError("Could not load more items. Check your connection and retry.");
        }
      }

      if (isInitialLoad) setInventory([]);
    } finally {
      if (isInitialLoad) setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!effectiveWorkspaceId) {
      setInventory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setInitialFetchError("");
    setLoadMoreError("");
    setHasTriedLoadMore(false);

    const initialQuery = query(
      collection(db, "inventory"),
      where("workspaceId", "==", effectiveWorkspaceId),
      orderBy("timestamp", "desc"),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      initialQuery,
      (snapshot) => {
        const firstPageItems = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...snapshotDoc.data()
        }));

        setInventory((prev) => {
          const firstPageIds = new Set(firstPageItems.map((item) => item.id));
          const olderLoadedItems = prev.filter((item) => !firstPageIds.has(item.id));
          return [...firstPageItems, ...olderLoadedItems];
        });

        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setInitialFetchError("");
        setLoading(false);
        fetchInventoryStats();
      },
      (error) => {
        console.error("Error subscribing to inventory:", error);
        const rawMessage = String(error?.message || "").toLowerCase();
        const missingIndex = rawMessage.includes("requires an index") || rawMessage.includes("failed-precondition");
        if (missingIndex) {
          setInitialFetchError("Inventory query needs a Firestore index. Deploy/update indexes, then refresh.");
        } else {
          setInitialFetchError("Could not load inventory right now.");
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [effectiveWorkspaceId, retryKey]);

  const filteredInventory = useMemo(() => {
    let filtered = [...inventory];

    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.name || "").toLowerCase().includes(search) ||
          (item.sku || "").toLowerCase().includes(search)
      );
    }

    if (selectedCategory && selectedCategory !== "All") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    if (statusFilter === "in_stock") {
      filtered = filtered.filter((i) => (i.quantity || 0) > 7);
    } else if (statusFilter === "low") {
      filtered = filtered.filter((i) => (i.quantity || 0) > 3 && (i.quantity || 0) <= 7);
    } else if (statusFilter === "critical") {
      filtered = filtered.filter((i) => (i.quantity || 0) > 0 && (i.quantity || 0) <= 3);
    } else if (statusFilter === "out") {
      filtered = filtered.filter((i) => (i.quantity || 0) === 0);
    }

    if (sortBy === "price_asc") {
      filtered.sort((a, b) => (a.sellingPrice || 0) - (b.sellingPrice || 0));
    } else if (sortBy === "price_desc") {
      filtered.sort((a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0));
    } else if (sortBy === "stock_asc") {
      filtered.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
    } else if (sortBy === "stock_desc") {
      filtered.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    } else if (sortBy === "name_az") {
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "newest") {
      filtered.sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return bTime - aTime;
      });
    }

    return filtered;
  }, [inventory, searchText, selectedCategory, statusFilter, sortBy]);

  const handleAddStock = async () => {
    const qty = parseFloat(addStockQty);

    if (!Number.isFinite(qty) || qty <= 0) {
      setAddStockError("Enter a valid quantity greater than 0.");
      return;
    }

    const item = inventory.find((invItem) => invItem.id === addStockItemId);

    try {
      setAddStockError("");
      await updateDoc(doc(db, "inventory", addStockItemId), {
        quantity: increment(qty),
        updatedAt: serverTimestamp()
      });

      if (currentUser) {
        try {
          await logAudit(
            currentUser.workspaceId,
            currentUser,
            "RESTOCKED_PRODUCT",
            `Restocked product: ${item?.name || addStockItemId} (+${qty})`
          );
        } catch (err) {
          console.error(err);
        }
      }

      setAddStockItemId(null);
      setAddStockQty("");
      setAddStockError("");
    } catch (error) {
      console.error("Error updating stock:", error);
      setAddStockError("Failed to update stock. Try again.");
    }
  };

  const handleRemoveStock = async () => {
    const qty = parseFloat(removeStockQty);

    if (!Number.isFinite(qty) || qty <= 0) {
      setRemoveStockError("Enter a valid quantity greater than 0.");
      return;
    }

    const item = inventory.find((invItem) => invItem.id === removeStockItemId);
    const currentQty = parseFloat(item?.quantity) || 0;

    if (qty > currentQty) {
      setRemoveStockError(`Cannot remove more than current stock (current: ${currentQty} units)`);
      return;
    }

    try {
      setRemoveStockError("");
      await updateDoc(doc(db, "inventory", removeStockItemId), {
        quantity: increment(-qty),
        updatedAt: serverTimestamp()
      });

      if (currentUser) {
        try {
          await logAudit(
            currentUser.workspaceId,
            currentUser,
            "REMOVED_STOCK",
            `Removed stock: ${item?.name || removeStockItemId} (-${qty}) Reason: ${removeStockReason}`
          );
        } catch (err) {
          console.error(err);
        }
      }

      setRemoveStockItemId(null);
      setRemoveStockQty("");
      setRemoveStockReason("Damaged");
      setRemoveStockError("");
    } catch (error) {
      console.error("Error removing stock:", error);
      setRemoveStockError("Failed to update stock. Try again.");
    }
  };

  const handleDelete = async (id, name) => {
    if (userRole !== "owner") {
      alert("Only owners can delete inventory items.");
      return;
    }

    if (!window.confirm(`Delete "${name}" from inventory?`)) return;

    try {
      await deleteDoc(doc(db, "inventory", id));

      if (currentUser) {
        try {
          await logAudit(
            currentUser.workspaceId,
            currentUser,
            'DELETED_PRODUCT',
            `Deleted product: ${name || id}`
          );
        } catch (err) {
          console.error(err);
        }
      }

      alert("✅ Item deleted successfully!");

      setInventory((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("❌ Failed to delete item.");
    }
  };

  const handleLoadMore = () => {
    setHasTriedLoadMore(true);
    fetchPage(false);
  };

  const handleRetry = () => {
    setInitialFetchError("");
    setLoadMoreError("");
    setRetryKey((prev) => prev + 1);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return "৳" + num.toFixed(2);
  };

  const tableRows = useMemo(() => {
    return filteredInventory.map((item) => {
      const price = parseFloat(item.buyingPrice) || 0;
      const qty = parseFloat(item.quantity) || 0;
      const total = price * qty;
      const isOutOfStock = qty <= 0;

      return (
        <tr
          key={item.id}
          className={`border-b transition ${isOutOfStock ? "bg-red-50 text-gray-400 hover:bg-red-100" : "hover:bg-gray-50"}`}
        >
          <td className={`p-3 ${isOutOfStock ? "text-gray-400" : "text-gray-600"}`}>{formatDate(item.timestamp)}</td>
          <td className={`p-3 font-semibold ${isOutOfStock ? "text-gray-500" : "text-gray-700"}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span>{item.name || "(Unnamed)"}</span>
              {((!item.sellingPrice ||
                 parseFloat(item.sellingPrice) === 0) ||
                !item.supplier ||
                String(item.supplier).trim() === "") && (
                <span
                  className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-300 whitespace-nowrap"
                  title="Some fields are incomplete. Click View to check."
                >
                  ⚠️ Incomplete
                </span>
              )}
            </div>
          </td>
          <td className={`p-3 ${isOutOfStock ? "text-gray-400" : "text-gray-600"}`}>{item.sku || "-"}</td>
          <td className={`p-3 ${isOutOfStock ? "text-gray-400" : "text-gray-600"}`}>
            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold">
              {item.category || "Other"}
            </span>
          </td>
          <td className={`p-3 text-right font-medium ${isOutOfStock ? "text-gray-500" : "text-gray-700"}`}>৳{price.toFixed(2)}</td>
          <td className={`p-3 text-right ${isOutOfStock ? "text-gray-500" : "text-gray-700"}`}>
            {qty.toFixed(0)}
            {isOutOfStock && (
              <span className="ml-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                [OUT OF STOCK]
              </span>
            )}
          </td>
          <td className={`p-3 text-right font-bold ${isOutOfStock ? "text-gray-500" : "text-gray-800"}`}>৳{total.toFixed(2)}</td>
          <td className="p-3 text-center">
            <div className="flex items-center justify-center gap-3">
              {(userRole === "owner" || userRole === "operator") && (
                <button
                  onClick={() => setDetailItem(item)}
                  className="text-indigo-600 hover:text-indigo-800 font-bold transition"
                  title="View Details"
                >
                  👁
                </button>
              )}
              {(userRole === "owner" || userRole === "operator") && (
                <button
                  onClick={() => {
                    setAddStockItemId(item.id);
                    setAddStockQty("");
                    setAddStockError("");
                  }}
                  className="text-green-600 hover:text-green-800 font-bold transition"
                  title="Add Stock"
                >
                  ➕
                </button>
              )}
              {(userRole === "owner" || userRole === "operator") && (
                <button
                  onClick={() => {
                    setRemoveStockItemId(item.id);
                    setRemoveStockQty("");
                    setRemoveStockReason("Damaged");
                    setRemoveStockError("");
                  }}
                  className="text-red-500 hover:text-red-700 font-bold transition"
                  title="Remove Stock"
                >
                  ➖
                </button>
              )}
              {userRole === "owner" && (
                <button
                  onClick={() => handleDelete(item.id, item.name)}
                  className="text-red-600 hover:text-red-800 font-bold transition"
                  title="Delete"
                >
                  🗑️
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    });
  }, [filteredInventory, userRole]);

  if (!currentUser) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-6xl mx-auto mt-6">
        <p className="text-center text-gray-500">Please login to view inventory.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Total SKUs",
            value: totalCount,
            icon: Package,
            bg: "bg-[#0F1F3D]/5",
            iconColor: "text-[#0F1F3D]",
          },
          {
            label: "Inventory Value",
            value: `৳${totalInventoryValue.toLocaleString()}`,
            icon: BarChart2,
            bg: "bg-green-50",
            iconColor: "text-green-600",
          },
          {
            label: "Low / Critical",
            value: totalLowCritical,
            icon: TrendingDown,
            bg: "bg-amber-50",
            iconColor: "text-amber-600",
          },
          {
            label: "Out of Stock",
            value: totalOutOfStock,
            icon: AlertTriangle,
            bg: "bg-red-50",
            iconColor: "text-red-500",
          },
          {
            label: "Total Items",
            value: totalItemsCount.toLocaleString(),
            icon: TrendingUp,
            bg: "bg-purple-50",
            iconColor: "text-purple-600",
          },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${k.bg}`}>
              <k.icon size={16} className={k.iconColor} />
            </div>
            <p className="text-slate-900 text-lg font-bold">{k.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* ── LOW STOCK ALERT BANNER ── */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-500" />
            <span className="text-red-700 text-sm font-semibold">
              {lowStockItems.length} items need immediate restocking
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.slice(0, 8).map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setAddStockItemId(a.id);
                  setAddStockQty("");
                  setAddStockError("");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-red-100 text-xs text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all cursor-pointer group"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${(a.quantity || 0) === 0 ? "bg-slate-400" : "bg-red-500"}`} />
                <span className="group-hover:font-semibold transition-all">{a.name}</span>
                <span className="text-slate-400 group-hover:text-red-400">· {a.quantity || 0} left</span>
                <span className="ml-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">+ Add Stock</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TABLE CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <Search size={14} className="text-slate-400" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search SKU or product name…"
              className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/add-inventory")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F1F3D] text-white hover:bg-[#162d54] text-sm transition-colors"
            >
              <Plus size={14} />
              <span>Add SKU</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-400 font-medium mr-1">Filter:</span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 outline-none cursor-pointer hover:border-[#0F1F3D]/30 transition-colors"
          >
            <option value="All">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="critical">Critical</option>
            <option value="out">Out of Stock</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 outline-none cursor-pointer hover:border-[#0F1F3D]/30 transition-colors"
          >
            <option value="newest">Newest First</option>
            <option value="name_az">Name A → Z</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="stock_asc">Stock: Low → High</option>
            <option value="stock_desc">Stock: High → Low</option>
          </select>

          {(statusFilter !== "All" || sortBy !== "newest") && (
            <button
              onClick={() => { setStatusFilter("All"); setSortBy("newest"); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
            >
              Clear Filters
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400">
            {filteredInventory.length} of {totalCount} products
          </span>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-slate-100 overflow-x-auto">
          {["All", ...CATEGORY_OPTIONS].map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c === "All" ? "" : c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                (c === "All" && !selectedCategory) || selectedCategory === c
                  ? "bg-[#0F1F3D] text-white font-semibold"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <InventorySkeleton />
        ) : initialFetchError ? (
          <div className="p-8 text-center text-red-500 text-sm">{initialFetchError}</div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No inventory items found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {["SL", "Product", "Category", "Stock", "Cost", "Selling Price", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs text-slate-400 px-4 py-3 whitespace-nowrap font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredInventory.map((item) => {
                  const qty = item.quantity || 0;
                  const isOut = qty === 0;
                  const isCritical = qty > 0 && qty <= 3;
                  const isLow = qty > 3 && qty <= 7;
                  const isIncomplete = !item.sellingPrice || !item.supplier;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/50 transition-colors ${isCritical || isOut ? "bg-red-50/20" : ""}`}
                    >
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {filteredInventory.indexOf(item) + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-800 font-medium">{item.name}</span>
                          {isIncomplete && (
                            <span title="Missing selling price or supplier" className="text-amber-500 text-xs">⚠️</span>
                          )}
                        </div>
                        {item.sku && <p className="text-[10px] text-[#0F1F3D]/60 font-mono mt-0.5">{item.sku}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.category || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${isOut ? "text-slate-400" : isCritical ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-800"}`}>
                          {qty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">৳{(item.buyingPrice || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-800 font-semibold">
                        {item.sellingPrice ? `৳${item.sellingPrice.toLocaleString()}` : <span className="text-amber-500">Not set</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] w-fit font-medium ${
                          isOut ? "bg-slate-100 text-slate-600" :
                          isCritical ? "bg-red-50 text-red-700" :
                          isLow ? "bg-amber-50 text-amber-700" :
                          "bg-green-50 text-green-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isOut ? "bg-slate-400" : isCritical ? "bg-red-500" : isLow ? "bg-amber-400" : "bg-green-400"
                          }`} />
                          {isOut ? "Out of Stock" : isCritical ? "Critical" : isLow ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"
                            title="View Details"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => setAddStockItemId(item.id)}
                            className="p-1.5 rounded-lg hover:bg-[#0F1F3D]/5 text-slate-400 hover:text-[#0F1F3D] transition-colors"
                            title="Add Stock"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={() => { navigate("/add-inventory", { state: { editItem: item } }); }}
                            className="p-1.5 rounded-lg hover:bg-[#E8B84B]/10 text-slate-400 hover:text-[#E8B84B] transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          {userRole === "owner" && (
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={12} />
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
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="flex justify-center py-4 border-t border-slate-100">
            <button
              onClick={() => fetchPage(false)}
              disabled={isLoadingMore}
              className="px-4 py-2 rounded-xl text-sm text-[#0F1F3D] border border-[#0F1F3D]/20 hover:bg-[#0F1F3D]/5 disabled:opacity-40 transition-colors"
            >
              {isLoadingMore ? "Loading…" : `Load More (${totalCount - inventory.length} remaining)`}
            </button>
          </div>
        )}
        {loadMoreError && (
          <p className="text-center text-xs text-red-500 py-2">{loadMoreError}</p>
        )}
      </div>

      {/* ── MODALS (unchanged) ── */}

      {addStockItemId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">➕ Add Stock</h3>
            <p className="text-sm text-gray-600 mb-1">
              Product: <span className="font-semibold text-gray-800">{inventory.find((item) => item.id === addStockItemId)?.name || "Unknown"}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Current Qty: <span className="font-semibold text-gray-800">{parseFloat(inventory.find((item) => item.id === addStockItemId)?.quantity || 0).toFixed(0)}</span>
            </p>

            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Quantity to Add</label>
            <input
              type="number"
              step="any"
              min="0"
              value={addStockQty}
              onChange={(e) => setAddStockQty(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quantity"
            />

            {addStockError && <p className="text-sm text-red-600 mt-2">{addStockError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAddStockItemId(null);
                  setAddStockQty("");
                  setAddStockError("");
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStock}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {removeStockItemId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">➖ Remove Stock</h3>
            <p className="text-sm text-gray-600 mb-1">
              Product: <span className="font-semibold text-gray-800">{inventory.find((item) => item.id === removeStockItemId)?.name || "Unknown"}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Current Qty: <span className="font-semibold text-orange-600">{parseFloat(inventory.find((item) => item.id === removeStockItemId)?.quantity || 0).toFixed(0)}</span>
            </p>

            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Quantity to Remove</label>
            <input
              type="number"
              step="any"
              min="0"
              value={removeStockQty}
              onChange={(e) => setRemoveStockQty(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter quantity"
            />

            <label className="text-xs font-bold text-gray-500 uppercase mb-1 mt-4 block">Reason</label>
            <select
              value={removeStockReason}
              onChange={(e) => setRemoveStockReason(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="Damaged">Damaged</option>
              <option value="Expired">Expired</option>
              <option value="Lost">Lost</option>
              <option value="Theft">Theft</option>
              <option value="Correction">Correction</option>
              <option value="Other">Other</option>
            </select>

            {removeStockError && <p className="text-sm text-red-600 mt-2">{removeStockError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRemoveStockItemId(null);
                  setRemoveStockQty("");
                  setRemoveStockReason("Damaged");
                  setRemoveStockError("");
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveStock}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {detailItem !== null && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setDetailItem(null)}
        />
      )}

      <div
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
        style={{
          transform: detailItem ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease"
        }}
      >
        <div className="bg-indigo-600 text-white p-5 relative">
          <h3 className="text-xl font-bold pr-10">{detailItem?.name || "Product Details"}</h3>
          <span className="inline-block mt-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            {detailItem?.category || "—"}
          </span>
          <button
            onClick={() => setDetailItem(null)}
            className="absolute top-4 right-4 text-white hover:text-indigo-100 text-xl leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          <p className="text-xs font-bold uppercase text-gray-400 mb-3 mt-5 border-b pb-1">📦 Product Info</p>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Product Name</span><span className="font-semibold text-gray-800">{detailItem?.name || "—"}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">SKU</span><span className="font-semibold text-gray-800">{detailItem?.sku || "—"}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Category</span><span className="font-semibold text-gray-800">{detailItem?.category || "—"}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Subcategory</span><span className="font-semibold text-gray-800">{detailItem?.subcategory || "—"}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Unit</span><span className="font-semibold text-gray-800">{detailItem?.unit || "—"}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Batch Number</span><span className="font-semibold text-gray-800">{detailItem?.batchNumber || "—"}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Expiry Date</span><span className="font-semibold text-gray-800">{detailItem?.expiryDate || "—"}</span></div>

          <p className="text-xs font-bold uppercase text-gray-400 mb-3 mt-5 border-b pb-1">📊 Stock Status</p>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm">
            <span className="text-gray-500">Current Quantity</span>
            <span className={`font-semibold ${parseFloat(detailItem?.quantity) > 0 ? "text-green-600" : "text-red-600"}`}>
              {detailItem?.quantity ?? "—"}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Stock Notes</span><span className="font-semibold text-gray-800">{detailItem?.stockNotes || "—"}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Date Added</span><span className="font-semibold text-gray-800">{formatDate(detailItem?.timestamp)}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Last Updated</span><span className="font-semibold text-gray-800">{detailItem?.updatedAt ? formatDate(detailItem?.updatedAt) : "Not yet updated"}</span></div>

          <p className="text-xs font-bold uppercase text-gray-400 mb-3 mt-5 border-b pb-1">💸 Pricing</p>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Buying Price</span><span className="font-semibold text-red-600">{formatCurrency(detailItem?.buyingPrice)}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Selling Price</span><span className="font-semibold text-green-600">{formatCurrency(detailItem?.sellingPrice)}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Discount Price</span><span className="font-semibold text-gray-800">{formatCurrency(detailItem?.discountPrice)}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Packaging Cost</span><span className="font-semibold text-gray-800">{formatCurrency(detailItem?.packaging)}</span></div>

          <p className="text-xs font-bold uppercase text-gray-400 mb-3 mt-5 border-b pb-1">🏭 Supplier Info</p>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Supplier Name</span><span className="font-semibold text-gray-800">{detailItem?.supplier || "—"}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Supplier Phone</span><span className="font-semibold text-gray-800">{detailItem?.supplierPhone || "—"}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Invoice Number</span><span className="font-semibold text-gray-800">{detailItem?.invoiceNumber || "—"}</span></div>

          <p className="text-xs font-bold uppercase text-gray-400 mb-3 mt-5 border-b pb-1">👤 Entry Info</p>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">Added By</span><span className="font-semibold text-gray-800">{detailItem?.addedBy || "—"}</span></div>
          <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm"><span className="text-gray-500">User Phone</span><span className="font-semibold text-gray-800">{detailItem?.userPhone || "—"}</span></div>
        </div>

        <div className="border-t p-4 pt-5 pb-6 flex gap-3">
          <button
            onClick={() => setDetailItem(null)}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 font-bold"
          >
            Close
          </button>
          <button
            onClick={() => {
              setDetailItem(null);
              navigate("/add-inventory", {
                state: { editItem: detailItem }
              });
            }}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-2 font-bold"
          >
            ✏️ Edit Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryList;
