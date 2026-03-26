import React, { useState } from "react";
import { parseProductWithAI } from "../services/aiService";
import { CATEGORY_OPTIONS } from "../utils/categories";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { logAudit } from "../utils/auditLogger";
import InventoryList from "../components/InventoryList";

const Inventory = () => {
  const { currentUser, workspaceId } = useAuth();
  const [aiInput, setAiInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    buyingPrice: "",
    quantity: "",
    category: "",
    subcategory: "",
    sku: "",
    batchNumber: "",
    unit: "",
    expiryDate: "",
    stockNotes: "",
    sellingPrice: "",
    discountPrice: "",
    supplier: "",
    supplierPhone: "",
    invoiceNumber: "",
    addedBy: "",
    userPhone: ""
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

  const handleMagicFill = async () => {
    if (!aiInput) return alert("Please paste some text first!");

    setIsThinking(true);
    const aiData = await parseProductWithAI(aiInput);

    if (aiData) {
      setFormData((prev) => ({
        ...prev,
        name: aiData.name || "",
        buyingPrice: aiData.price || "",
        quantity: aiData.quantity || "",
        category: normalizeCategory(aiData.category) || "Other"
      }));
    } else {
      alert("AI couldn't understand that. Try simpler text.");
    }
    setIsThinking(false);
  };

  const handleSave = async () => {
    const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

    if (!currentUser || !effectiveWorkspaceId) return alert("Please login first.");
    if (!formData.name || !formData.buyingPrice) return alert("Fill required fields");

    const safeBuyingPrice = toNumber(formData.buyingPrice);
    const safeQuantity = toNumber(formData.quantity);
    const productName = String(formData.name || "").trim();
    const safeSellingPrice = toNumber(formData.sellingPrice);
    const safeDiscountPrice = toNumber(formData.discountPrice);
    const safeCategory = normalizeCategory(formData.category);
    const addedByFallback = currentUser?.displayName || currentUser?.email || "";
    const safeAddedBy = String(formData.addedBy || addedByFallback || "").trim();

    if (safeBuyingPrice <= 0) return alert("Buying price must be greater than 0");

    try {
      await addDoc(collection(db, "inventory"), {
        userId: currentUser.uid,
        workspaceId: effectiveWorkspaceId,
        name: String(formData.name || "").trim(),
        buyingPrice: safeBuyingPrice,
        quantity: safeQuantity,
        category: String(safeCategory || "Other").trim(),
        subcategory: String(formData.subcategory || "").trim(),
        sku: String(formData.sku || "").trim(),
        batchNumber: String(formData.batchNumber || "").trim(),
        unit: String(formData.unit || "").trim(),
        expiryDate: String(formData.expiryDate || "").trim(),
        stockNotes: String(formData.stockNotes || "").trim(),
        sellingPrice: safeSellingPrice,
        discountPrice: safeDiscountPrice,

        supplier: String(formData.supplier || "").trim(),
        supplierPhone: String(formData.supplierPhone || "").trim(),
        invoiceNumber: String(formData.invoiceNumber || "").trim(),
        addedBy: safeAddedBy,
        userPhone: String(formData.userPhone || "").trim(),
        timestamp: serverTimestamp()
      });

      if (currentUser) {
        try {
          await logAudit(
            currentUser.workspaceId,
            currentUser,
            "ADDED_INVENTORY",
            `Added product: ${productName}`
          );
          console.log("Audit fired successfully");
        } catch (err) {
          console.error(err);
        }
      }

      alert("✅ Stock Added to Inventory!");
      setFormData({
        name: "",
        buyingPrice: "",
        quantity: "",
        category: "",
        subcategory: "",
        sku: "",
        batchNumber: "",
        unit: "",
        expiryDate: "",
        stockNotes: "",
        sellingPrice: "",
        discountPrice: "",
        supplier: "",
        supplierPhone: "",
        invoiceNumber: "",
        addedBy: "",
        userPhone: ""
      });
      setAiInput("");
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Failed to save.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">📦 Inventory</h2>
        <p className="text-xs text-gray-400">Add and manage your stock with AI assistance.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto mt-6">
        <div className="border-b pb-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">📦 Add New Stock</h2>
          <p className="text-xs text-gray-400">Use AI to parse supplier messages instantly.</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-xl mb-6 border border-purple-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-purple-200 text-purple-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
            BETA FEATURE
          </div>
          <label className="block text-sm font-bold text-purple-700 mb-2">
            ✨ AI Smart Paste
          </label>
          <div className="flex gap-2">
            <textarea
              rows={3}
              placeholder="e.g. 'Premium Denim Jeans 50 pcs 650 taka'"
              className="w-full p-3 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <button
              onClick={handleMagicFill}
              disabled={isThinking}
              className="bg-purple-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-purple-700 transition flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              {isThinking ? "⚙️..." : "Auto-Fill"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Product Name</label>
            <input
              className="w-full p-2 border rounded font-bold text-gray-700"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Buying Price (Unit)</label>
              <input
                type="number"
                className="w-full p-2 border border-red-200 rounded text-red-600 font-bold"
                value={formData.buyingPrice}
                onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Quantity</label>
              <input
                type="number"
                className="w-full p-2 border rounded font-bold"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
            <input
              list="category-options"
              className="w-full p-2 border rounded font-bold text-gray-700"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Select or type a category"
            />
            <datalist id="category-options">
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Subcategory</label>
            <input
              className="w-full p-2 border rounded font-bold text-gray-700"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              placeholder="e.g. Sneakers, Men's Wear"
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">📦 Inventory Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">SKU</label>
                <input
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SKU-123"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Batch Number</label>
                <input
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="Batch-01"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Unit</label>
                <input
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="pcs / box / kg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Expiry Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-bold text-gray-500 uppercase">Stock Notes</label>
              <textarea
                rows={2}
                className="w-full p-2 border rounded text-gray-700"
                value={formData.stockNotes}
                onChange={(e) => setFormData({ ...formData, stockNotes: e.target.value })}
                placeholder="Any storage notes or conditions"
              />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
            <h3 className="text-xs font-bold text-green-700 uppercase mb-3">💸 Sales Info</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Selling Price</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Discount Price</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.discountPrice}
                  onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
            <h3 className="text-xs font-bold text-orange-700 uppercase mb-3">🏭 Supplier Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Supplier Name</label>
                <input
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Supplier Phone</label>
                <input
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.supplierPhone}
                  onChange={(e) => setFormData({ ...formData, supplierPhone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Invoice Number</label>
                <input
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="Invoice #"
                />
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <h3 className="text-xs font-bold text-indigo-700 uppercase mb-3">👤 User Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Added By</label>
                <input
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.addedBy}
                  onChange={(e) => setFormData({ ...formData, addedBy: e.target.value })}
                  placeholder="Auto-filled on save"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">User Phone</label>
                <input
                  className="w-full p-2 border rounded font-bold text-gray-700"
                  value={formData.userPhone}
                  onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                  placeholder="Your phone"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition shadow-lg mt-2"
          >
            📥 Save to Inventory
          </button>
        </div>
      </div>

      <InventoryList />
    </div>
  );
};

export default Inventory;
