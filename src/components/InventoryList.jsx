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
  const [totalCount, setTotalCount] = useState(0);
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

  useEffect(() => {
    if (!effectiveWorkspaceId) {
      setTotalCount(0);
      return;
    }

    const fetchTotalCount = async () => {
      try {
        const countQuery = query(
          collection(db, "inventory"),
          where("workspaceId", "==", effectiveWorkspaceId)
        );
        const snapshot = await getCountFromServer(countQuery);
        setTotalCount(snapshot.data().count);
      } catch (error) {
        console.error("Error fetching total count:", error);
        setTotalCount(0);
      }
    };

    fetchTotalCount();
  }, [effectiveWorkspaceId]);

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

    return filtered;
  }, [inventory, searchText, selectedCategory]);

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

  const totalItems = filteredInventory.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0);
  }, 0);

  const totalValue = filteredInventory.reduce((sum, item) => {
    const price = parseFloat(item.buyingPrice) || 0;
    const qty = parseFloat(item.quantity) || 0;
    return sum + price * qty;
  }, 0);

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

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-6xl mx-auto mt-6">
        <div className="border-b pb-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">📋 Inventory List</h2>
          <p className="text-xs text-gray-400">View and manage your stock items.</p>
        </div>
        <InventorySkeleton />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-6xl mx-auto mt-6">
      <div className="border-b pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800">📋 Inventory List</h2>
        <p className="text-xs text-gray-400">View and manage your stock items.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-600 font-bold uppercase mb-1">Total Items in Stock</p>
          <p className="text-2xl font-bold text-blue-700">{totalItems.toFixed(0)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <p className="text-xs text-green-600 font-bold uppercase mb-1">Total Inventory Value</p>
          <p className="text-2xl font-bold text-green-700">৳{totalValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">🔍 Search by Name or SKU</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type product name or SKU..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">📁 Filter by Category</label>
          <select
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {inventory.length === 0 ? (
            <>
              <p className="text-lg font-semibold mb-2">📦 No inventory items yet</p>
              <p className="text-sm">
                {initialFetchError
                  ? "Inventory is temporarily unavailable. Use refresh/retry after fixing connection or index."
                  : "Add your first stock item using the form above."}
              </p>
              {initialFetchError && (
                <button
                  onClick={handleRetry}
                  className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  Refresh Inventory
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-lg font-semibold mb-2">🔍 No results found</p>
              <p className="text-sm">Try adjusting your search or filter.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left p-3 border-b font-bold">Date</th>
                  <th className="text-left p-3 border-b font-bold">Product Name</th>
                  <th className="text-left p-3 border-b font-bold">SKU</th>
                  <th className="text-left p-3 border-b font-bold">Category</th>
                  <th className="text-right p-3 border-b font-bold">Buying Price</th>
                  <th className="text-right p-3 border-b font-bold">Qty</th>
                  <th className="text-right p-3 border-b font-bold">Total Value</th>
                  <th className="text-center p-3 border-b font-bold">Action</th>
                </tr>
              </thead>
              <tbody>{tableRows}</tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
            <p className="text-gray-600">
              Showing <span className="font-bold">{filteredInventory.length}</span> of{" "}
              <span className="font-bold">{inventory.length}</span> items
            </p>
            <p className="text-gray-600">
              Total Value: <span className="font-bold text-green-600">৳{totalValue.toFixed(2)}</span>
            </p>
          </div>

          {!searchText && !selectedCategory && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 mb-3">
                Showing <span className="font-bold text-gray-700">{inventory.length}</span> of{" "}
                <span className="font-bold text-gray-700">{totalCount}</span> total items
              </p>
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {isLoadingMore ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>⬇️ Load More</>
                  )}
                </button>
              )}

              {!hasMore && hasTriedLoadMore && (
                <p className="text-sm text-gray-500 mt-3">No more items to load.</p>
              )}

              {loadMoreError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700 font-medium">⚠️ {loadMoreError}</p>
                  <button
                    onClick={handleLoadMore}
                    className="mt-2 bg-red-600 text-white px-3 py-1.5 rounded font-bold hover:bg-red-700 transition"
                  >
                    Retry Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

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

        <div className="border-t p-4 flex gap-3">
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
