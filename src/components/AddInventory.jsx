/* src/components/AddInventory.jsx */
import React, { useState } from "react";
// 👇 Make sure you created this file in the previous step!
import { parseProductWithAI, parseMultipleProductsWithAI } from "../services/aiService"; 
import ImageUploadOCR from "./ImageUploadOCR";
import { CATEGORY_OPTIONS } from "../utils/categories";
import { db, auth } from "../firebase"; // Using your existing firebase connection
import { collection, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../utils/auditLogger';
import { useNavigate } from "react-router-dom";

const AddInventory = () => {
  const { currentUser, workspaceId } = useAuth();
  const navigatePage = useNavigate();
  // 1. State for the Magic AI Input
  const [aiInput, setAiInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isBulkThinking, setIsBulkThinking] = useState(false);
  const [inputMode, setInputMode] = useState("text"); // "text" | "image" | "bulk"
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkSupplier, setBulkSupplier] = useState({
    supplierName: "",
    invoiceNumber: ""
  });

  // 2. State for the Form Data
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

  // ✨ THE AI FUNCTION
  const handleMagicFill = async () => {
    if (!aiInput) return alert("Please paste some text first!");
    
    setIsThinking(true);
    // Call the Brain (Gemini)
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

  // 📦 BULK IMPORT FUNCTION
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
            'ADDED_INVENTORY_BULK', 
            `Added ${bulkItems.length} items via bulk entry` 
          );
        } catch (auditErr) {
          console.error(auditErr);
        }
      }
      const bulkCount = bulkItems.length;
      const goToList = window.confirm(
        `✅ ${bulkCount} product(s) saved to inventory!\n\nSome fields like Selling Price may still be empty.\n\nClick OK to go to Inventory List.\nClick Cancel to stay and add more.`
      );
      if (goToList) {
        navigatePage("/inventory-list");
      }
      setBulkItems([]);
      setAiInput("");
      setBulkSupplier({ supplierName: "", invoiceNumber: "" });
    } catch (error) {
      console.error("Error saving bulk items:", error);
      alert("❌ Failed to save bulk items.");
    }
  };

  // 📷 HANDLE IMAGE OCR DATA
  const handleImageDataExtracted = (extractedData) => {
    if (!extractedData) return;

    const name = extractedData.identity?.name || "";
    const price = extractedData.pricing?.cost_price
      ?? extractedData.pricing?.selling_price
      ?? extractedData.pricing?.discount_price
      ?? "";
    const quantity = extractedData.inventory?.quantity ?? "";
    const category = normalizeCategory(extractedData.classification?.category) || "Other";

    const subcategory = String(extractedData.classification?.subcategory || "").trim();
    const sku = String(extractedData.identity?.sku || "").trim();
    const batchNumber = String(extractedData.inventory?.batch_number || "").trim();
    const unit = String(extractedData.inventory?.unit || "").trim();
    const expiryDate = String(extractedData.inventory?.expiry_date || "").trim();
    const sellingPrice = extractedData.pricing?.selling_price ?? "";
    const discountPrice = extractedData.pricing?.discount_price ?? "";
    const supplier = String(extractedData.business?.supplier_name || "").trim();
    const invoiceNumber = String(extractedData.business?.invoice_number || "").trim();

    setFormData((prev) => ({
      ...prev,
      name,
      buyingPrice: price,
      quantity,
      category,
      subcategory,
      sku,
      batchNumber,
      unit,
      expiryDate,
      sellingPrice,
      discountPrice,
      supplier,
      invoiceNumber
    }));
  };

  // 💾 SAVE TO FIREBASE (Inventory Collection)
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
            'ADDED_INVENTORY',
            `Added product: ${productName}`
          );
          console.log('Audit fired successfully');
        } catch (err) {
          console.error(err);
        }
      }

      const savedName = String(formData.name || "").trim();
      const goToListSingle = window.confirm(
        `✅ "${savedName}" saved to inventory!\n\nSome fields like Selling Price or Supplier may still be empty.\n\nClick OK to go to Inventory List.\nClick Cancel to stay and add another.`
      );
      if (goToListSingle) {
        navigatePage("/inventory-list");
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
      setAiInput("");
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Failed to save.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto mt-6">
      <div className="border-b pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800">📦 Add New Stock</h2>
        <p className="text-xs text-gray-400">Use AI to parse supplier messages instantly.</p>
      </div>

      {/* --- AI SECTION STARTS --- */}
      <div className="border-b pb-4 mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3">✨ Choose Input Method</h3>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setInputMode("text")}
            className={`flex-1 py-2 px-4 rounded-lg font-bold transition ${
              inputMode === "text"
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📝 Text/Paste
          </button>
          <button
            onClick={() => setInputMode("image")}
            className={`flex-1 py-2 px-4 rounded-lg font-bold transition ${
              inputMode === "image"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📷 Image/OCR
          </button>
          <button
            onClick={() => setInputMode("bulk")}
            className={`flex-1 py-2 px-4 rounded-lg font-bold transition ${
              inputMode === "bulk"
                ? "bg-amber-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📦 Bulk Text Import
          </button>
        </div>
      </div>

      {/* TEXT INPUT MODE */}
      {inputMode === "text" && (
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
      )}

      {/* IMAGE INPUT MODE */}
      {inputMode === "image" && (
        <ImageUploadOCR onDataExtracted={handleImageDataExtracted} />
      )}

      {/* BULK TEXT INPUT MODE */}
      {inputMode === "bulk" && (
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
      )}

      {/* BULK REVIEW TABLE */}
      {inputMode === "bulk" && bulkItems.length > 0 && (
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
      {/* --- AI SECTION ENDS --- */}

      {/* MANUAL FORM SECTION */}
      {inputMode !== "bulk" && (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Product Name</label>
          <input
            className="w-full p-2 border rounded font-bold text-gray-700"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Buying Price (Unit)</label>
            <input
              type="number"
              className="w-full p-2 border border-red-200 rounded text-red-600 font-bold"
              value={formData.buyingPrice}
              onChange={(e) => setFormData({...formData, buyingPrice: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Quantity</label>
            <input
              type="number"
              className="w-full p-2 border rounded font-bold"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
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
      )}
    </div>
  );
};

export default AddInventory;