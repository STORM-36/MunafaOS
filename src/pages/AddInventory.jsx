import React, { useState, useEffect } from "react";
import { parseProductWithAI } from "../services/aiService";
import { CATEGORY_OPTIONS } from "../utils/categories";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { logAudit } from "../utils/auditLogger";
import { useLocation, useNavigate } from "react-router-dom";

const AddInventory = () => {
  const { currentUser, workspaceId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const editItem = location.state?.editItem || null;
  const isEditMode = !!editItem;
  const [aiInput, setAiInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [packagingCost, setPackagingCost] = useState(0);

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

  useEffect(() => {
    if (!editItem) return;
    setFormData({
      name: editItem.name || "",
      buyingPrice: editItem.buyingPrice || "",
      quantity: editItem.quantity || "",
      category: editItem.category || "",
      subcategory: editItem.subcategory || "",
      sku: editItem.sku || "",
      batchNumber: editItem.batchNumber || "",
      unit: editItem.unit || "",
      expiryDate: editItem.expiryDate || "",
      stockNotes: editItem.stockNotes || "",
      sellingPrice: editItem.sellingPrice || "",
      discountPrice: editItem.discountPrice || "",
      supplier: editItem.supplier || "",
      supplierPhone: editItem.supplierPhone || "",
      invoiceNumber: editItem.invoiceNumber || "",
      addedBy: editItem.addedBy || "",
      userPhone: editItem.userPhone || ""
    });
    setPackagingCost(editItem.packaging || 0);
  }, []);

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

  const isCriticalEmpty = (value) => {
    if (typeof value === "string" && value.trim() === "") return true;
    if (value === 0 || value === "0") return true;
    const parsed = parseFloat(value);
    return !Number.isNaN(parsed) && parsed === 0;
  };

  const isRecommendedEmpty = (value) => String(value ?? "").trim() === "";

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
    const discountState = formData.discountPrice;
    const safePackagingCost = toNumber(packagingCost);
    const safeCategory = normalizeCategory(formData.category);
    const addedByFallback = currentUser?.displayName || currentUser?.email || "";
    const safeAddedBy = String(formData.addedBy || addedByFallback || "").trim();

    if (safeBuyingPrice <= 0) return alert("Buying price must be greater than 0");

    if (isEditMode) {
      try {
        await updateDoc(doc(db, "inventory", editItem.id), {
          name: String(formData.name || "").trim(),
          buyingPrice: safeBuyingPrice,
          packaging: Number(safePackagingCost),
          quantity: safeQuantity,
          category: String(safeCategory || "Other").trim(),
          subcategory: String(formData.subcategory || "").trim(),
          sku: String(formData.sku || "").trim(),
          batchNumber: String(formData.batchNumber || "").trim(),
          unit: String(formData.unit || "").trim(),
          expiryDate: String(formData.expiryDate || "").trim(),
          stockNotes: String(formData.stockNotes || "").trim(),
          sellingPrice: safeSellingPrice,
          discount: Number(formData.discountPrice || 0),
          discountPrice: safeDiscountPrice,
          supplier: String(formData.supplier || "").trim(),
          supplierPhone: String(formData.supplierPhone || "").trim(),
          invoiceNumber: String(formData.invoiceNumber || "").trim(),
          addedBy: safeAddedBy,
          userPhone: String(formData.userPhone || "").trim(),
          updatedAt: serverTimestamp()
        });

        if (currentUser) {
          try {
            await logAudit(
              currentUser.workspaceId,
              currentUser,
              "EDITED_PRODUCT",
              `Edited product: ${productName}`
            );
          } catch (err) {
            console.error(err);
          }
        }

        alert("✅ Inventory Updated!");
        navigate("/inventory-list");
        return;
      } catch (error) {
        console.error("Error updating:", error);
        alert("❌ Failed to update.");
        return;
      }
    }

    try {
      await addDoc(collection(db, "inventory"), {
        userId: currentUser.uid,
        workspaceId: effectiveWorkspaceId,
        name: String(formData.name || "").trim(),
        buyingPrice: safeBuyingPrice,
        packaging: Number(safePackagingCost),
        quantity: safeQuantity,
        category: String(safeCategory || "Other").trim(),
        subcategory: String(formData.subcategory || "").trim(),
        sku: String(formData.sku || "").trim(),
        batchNumber: String(formData.batchNumber || "").trim(),
        unit: String(formData.unit || "").trim(),
        expiryDate: String(formData.expiryDate || "").trim(),
        stockNotes: String(formData.stockNotes || "").trim(),
        sellingPrice: safeSellingPrice,
        discount: Number(discountState || 0),
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

      const justSavedName = productName;
      const confirmed = window.confirm(
        `✅ "${justSavedName}" saved to inventory!\n\nSome fields like Selling Price or Supplier may still be empty.\n\nClick OK to go to Inventory List.\nClick Cancel to stay and add another product.`
      );
      if (confirmed) {
        navigate("/inventory-list");
      }
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
      setPackagingCost(0);
      setAiInput("");
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Failed to save.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">{isEditMode ? "✏️ Edit Stock" : "📦 Add New Stock"}</h2>
        <p className="text-xs text-gray-400">Add inventory with AI assistance.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto mt-6">
        <div className="border-b pb-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">{isEditMode ? "✏️ Edit Stock" : "📦 Add New Stock"}</h2>
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
              className={`w-full p-2 border rounded font-bold text-gray-700 ${isRecommendedEmpty(formData.category) ? "border-yellow-400" : ""}`}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Select or type a category"
            />
            {!formData.category && (
              <p className="text-xs text-yellow-600 font-semibold mt-1">
                ⚠️ Required for analytics
              </p>
            )}
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
                  className={`w-full p-2 border rounded font-bold text-gray-700 ${isRecommendedEmpty(formData.sku) ? "border-blue-300" : ""}`}
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SKU-123"
                />
                {!formData.sku && (
                  <p className="text-xs text-blue-500 font-semibold mt-1">
                    💡 Recommended for product tracking
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Batch Number</label>
                <input
                  className={`w-full p-2 border rounded font-bold text-gray-700 ${isRecommendedEmpty(formData.batchNumber) ? "border-blue-300" : ""}`}
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="Batch-01"
                />
                {!formData.batchNumber && (
                  <p className="text-xs text-blue-500 font-semibold mt-1">
                    💡 Recommended for batch management
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Unit</label>
                <input
                  className={`w-full p-2 border rounded font-bold text-gray-700 ${isRecommendedEmpty(formData.unit) ? "border-blue-300" : ""}`}
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="pcs / box / kg"
                />
                {!formData.unit && (
                  <p className="text-xs text-blue-500 font-semibold mt-1">
                    💡 Recommended for stock clarity
                  </p>
                )}
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
                  className={`w-full p-2 border rounded font-bold text-gray-700 ${isCriticalEmpty(formData.sellingPrice) ? "border-yellow-400" : ""}`}
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                />
                {(!formData.sellingPrice || parseFloat(formData.sellingPrice) === 0) && (
                  <p className="text-xs text-yellow-600 font-semibold mt-1">
                    ⚠️ Required for profit calculation
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Packaging Cost (Per Unit)</label>
                <input
                  type="number"
                  className={`w-full p-2 border rounded font-bold text-gray-700 ${isCriticalEmpty(packagingCost) ? "border-yellow-400" : ""}`}
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)}
                />
                {(!packagingCost || parseFloat(packagingCost) === 0) && (
                  <p className="text-xs text-yellow-600 font-semibold mt-1">
                    ⚠️ Required for profit calculation
                  </p>
                )}
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
                  className={`w-full p-2 border rounded font-bold text-gray-700 ${isRecommendedEmpty(formData.supplier) ? "border-yellow-400" : ""}`}
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
                {(!formData.supplier || String(formData.supplier).trim() === "") && (
                  <p className="text-xs text-yellow-600 font-semibold mt-1">
                    ⚠️ Required for supplier tracking
                  </p>
                )}
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
            {isEditMode ? "✏️ Update Inventory" : "📥 Save to Inventory"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddInventory;
