import React, { useState } from "react";
import { parseMultipleProductsWithAI } from "../services/aiService";
import { CATEGORY_OPTIONS } from "../utils/categories";
import { db } from "../firebase";
import { collection, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { logAudit } from "../utils/auditLogger";
import { useNavigate } from "react-router-dom";

const BulkImport = () => {
  const { currentUser, workspaceId } = useAuth();
  const navigate = useNavigate();
  const [aiInput, setAiInput] = useState("");
  const [isBulkThinking, setIsBulkThinking] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkSupplier, setBulkSupplier] = useState({
    supplierName: "",
    invoiceNumber: ""
  });

  const toNumber = (value) => {
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.min(num, 10000000);
  };

  const normalizeCategory = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "Other";
    const match = CATEGORY_OPTIONS.find(
      (option) => option.toLowerCase() === raw.toLowerCase()
    );
    return match || "Other";
  };

  const handleBulkParse = async () => {
    if (!aiInput) return alert("Please paste supplier text first!");

    setIsBulkThinking(true);
    const items = await parseMultipleProductsWithAI(aiInput);

    if (Array.isArray(items) && items.length > 0) {
      setBulkItems(items);
      console.log(`✅ Found ${items.length} products from bulk import.`);
    } else {
      setBulkItems([]);
      alert("No products found. Try clearer text or fewer items.");
    }

    setIsBulkThinking(false);
  };

  const handleRemoveBulkItem = (index) => {
    setBulkItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkSave = async () => {
    const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

    if (!currentUser || !effectiveWorkspaceId) return alert("Please login first.");
    if (!bulkItems.length) return alert("No items to save.");

    const batch = writeBatch(db);
    const userId = currentUser.uid;
    const supplierName = String(bulkSupplier.supplierName || "").trim();
    const invoiceNumber = String(bulkSupplier.invoiceNumber || "").trim();

    bulkItems.forEach((item) => {
      const safeBuyingPrice = toNumber(item?.price ?? item?.buyingPrice ?? 0);
      const safeQuantity = toNumber(item?.quantity ?? 0);
      const safeCategory = normalizeCategory(item?.category);
      const name = String(item?.name || "").trim();

      if (!name || safeBuyingPrice <= 0) return;

      const docRef = doc(collection(db, "inventory"));
      batch.set(docRef, {
        userId,
        workspaceId: effectiveWorkspaceId,
        name,
        buyingPrice: safeBuyingPrice,
        quantity: safeQuantity,
        category: String(safeCategory || "Other").trim(),
        subcategory: "",
        sku: "",
        batchNumber: "",
        unit: "",
        expiryDate: "",
        stockNotes: "",
        sellingPrice: 0,
        discountPrice: 0,
        supplier: supplierName,
        supplierPhone: "",
        invoiceNumber,
        addedBy: userId,
        userPhone: "",
        importMethod: "AI_BULK",
        rawSourceText: aiInput,
        timestamp: serverTimestamp()
      });
    });

    try {
      await batch.commit();
      if (currentUser) {
        try {
          await logAudit(
            currentUser.workspaceId,
            currentUser,
            "ADDED_INVENTORY_BULK",
            `Added ${bulkItems.length} items via bulk entry`
          );
        } catch (auditErr) {
          console.error(auditErr);
        }
      }
      const bulkCount = bulkItems.length;
      const goToList = window.confirm(
        `✅ ${bulkCount} product(s) saved!\n\nSome fields like Selling Price may be empty.\n\nOK → Go to Inventory List\nCancel → Stay and add more`
      );
      if (goToList) {
        navigate("/inventory-list");
      }
      setBulkItems([]);
      setAiInput("");
      setBulkSupplier({ supplierName: "", invoiceNumber: "" });
    } catch (error) {
      console.error("Error saving bulk items:", error);
      alert("❌ Failed to save bulk items.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">📦 Bulk Import</h2>
        <p className="text-xs text-gray-400">Extract and save multiple inventory items from supplier text.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-4xl mx-auto mt-6">
        <div className="border-b pb-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">📦 Add New Stock</h2>
          <p className="text-xs text-gray-400">Use AI to parse supplier messages instantly.</p>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl mb-6 border border-amber-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
            BULK MODE
          </div>
          <label className="block text-sm font-bold text-amber-700 mb-2">
            📦 Bulk Supplier Paste
          </label>
          <div className="flex gap-2">
            <textarea
              rows={4}
              placeholder="e.g. 'Red shirt 50 pcs 500tk, Blue jeans 30 pcs 800tk, Black jacket 20 pcs 1200tk'"
              className="w-full p-3 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <button
              onClick={handleBulkParse}
              disabled={isBulkThinking}
              className="bg-amber-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-amber-700 transition flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              {isBulkThinking ? "⚙️..." : "Extract Items"}
            </button>
          </div>
        </div>

        {bulkItems.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-700">
                Review Items ({bulkItems.length})
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="text-left p-2 border-b">#</th>
                    <th className="text-left p-2 border-b">Name</th>
                    <th className="text-left p-2 border-b">Qty</th>
                    <th className="text-left p-2 border-b">Buying Price</th>
                    <th className="text-left p-2 border-b">Category</th>
                    <th className="text-left p-2 border-b">Total Price</th>
                    <th className="text-center p-2 border-b">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkItems.map((item, index) => (
                    <tr key={`${item?.name || "item"}-${index}`} className="border-b">
                      <td className="p-2 text-gray-500">
                        {index + 1}
                      </td>
                      <td className="p-2 font-semibold text-gray-700">
                        {item?.name || "(Unnamed)"}
                      </td>
                      <td className="p-2 text-gray-600">
                        {item?.quantity ?? "-"}
                      </td>
                      <td className="p-2 text-gray-600">
                        {item?.buyingPrice ?? item?.cost_price ?? item?.price ?? "-"}
                      </td>
                      <td className="p-2 text-gray-600">
                        {item?.category || "Other"}
                      </td>
                      <td className="p-2 text-gray-700 font-semibold">
                        {(() => {
                          const unitPrice = toNumber(item?.buyingPrice ?? item?.cost_price ?? 0);
                          const qty = toNumber(item?.quantity ?? 1);
                          return (unitPrice * (qty || 1)).toFixed(2);
                        })()}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleRemoveBulkItem(index)}
                          className="text-red-600 hover:text-red-800 font-bold"
                          title="Remove"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <h5 className="text-xs font-bold text-amber-700 uppercase mb-2">🏭 Supplier Info</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Supplier Name</label>
                  <input
                    className="w-full p-2 border rounded font-bold text-gray-700"
                    value={bulkSupplier.supplierName}
                    onChange={(e) => setBulkSupplier({ ...bulkSupplier, supplierName: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Invoice Number</label>
                  <input
                    className="w-full p-2 border rounded font-bold text-gray-700"
                    value={bulkSupplier.invoiceNumber}
                    onChange={(e) => setBulkSupplier({ ...bulkSupplier, invoiceNumber: e.target.value })}
                    placeholder="Invoice #"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleBulkSave}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition"
              >
                ✅ Confirm & Save All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImport;
