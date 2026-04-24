import React, { useState, useEffect } from "react";
import { parseProductWithAI } from "../services/aiService";
import { CATEGORY_OPTIONS } from "../utils/categories";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, updateDoc, doc, writeBatch } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { logAudit } from "../utils/auditLogger";
import { useLocation, useNavigate } from "react-router-dom";
import ImageUploadOCR from "../components/ImageUploadOCR";
import { parseMultipleProductsWithAI } from "../services/aiService";

const AddInventory = () => {
  const { currentUser, workspaceId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const editItem = location.state?.editItem || null;
  const isEditMode = !!editItem;
  const [aiInput, setAiInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isBulkThinking, setIsBulkThinking] = useState(false);
  const [inputMode, setInputMode] = useState("text");
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkSupplier, setBulkSupplier] = useState({
    supplierName: "",
    invoiceNumber: ""
  });
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
    packaging: "",
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

  const handleBulkParse = async () => {
    if (!aiInput) return alert("Please paste supplier text first!");
    setIsBulkThinking(true);
    const items = await parseMultipleProductsWithAI(aiInput);
    if (Array.isArray(items) && items.length > 0) {
      setBulkItems(items);
    } else {
      setBulkItems([]);
      alert("No products found. Try clearer text.");
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
      const goToList = window.confirm(
        `✅ ${bulkItems.length} product(s) saved!\n\nClick OK to go to Inventory List.\nClick Cancel to stay and add more.`
      );
      if (goToList) navigatePage("/inventory-list");
      setBulkItems([]);
      setAiInput("");
      setBulkSupplier({ supplierName: "", invoiceNumber: "" });
    } catch (error) {
      console.error("Error saving bulk items:", error);
      alert("❌ Failed to save bulk items.");
    }
  };

  const handleImageDataExtracted = (extractedData) => {
    if (!extractedData) return;
    const name = extractedData.identity?.name || "";
    const price = extractedData.pricing?.cost_price
      ?? extractedData.pricing?.selling_price
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
      name, buyingPrice: price, quantity, category,
      subcategory, sku, batchNumber, unit, expiryDate,
      sellingPrice, discountPrice, supplier, invoiceNumber
    }));
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
        packaging: toNumber(formData.packaging),
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
        packaging: "",
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
    <div className="min-h-screen p-4 sm:p-6" style={{ background: '#F6F8FC' }}>
      <div className="max-w-4xl mx-auto space-y-5">

        {/* MODE SELECTOR HEADER */}
        <div className="rounded-2xl p-5 text-white"
          style={{ background: 'linear-gradient(135deg, #0F1F3D 0%, #1a3260 100%)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold" style={{ color: '#E8B84B' }}>INVENTORY MANAGEMENT</p>
              <h1 className="text-xl font-extrabold text-white mt-0.5">Add New Product</h1>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Choose your input method below
              </p>
            </div>
            {/* Mode Pills */}
            <div className="flex items-center gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
              {[
                { key: 'text', label: '✍️ Manual / AI', color: '#5B4FCF' },
                { key: 'image', label: '📷 OCR Scan', color: '#2E5BA8' },
                { key: 'bulk', label: '📦 Bulk Import', color: '#9A6F00' },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setInputMode(m.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
                  style={{
                    background: inputMode === m.key ? '#fff' : 'transparent',
                    color: inputMode === m.key ? m.color : 'rgba(255,255,255,0.6)',
                    boxShadow: inputMode === m.key ? '0 1px 4px rgba(0,0,0,0.15)' : 'none'
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── TEXT / AI MODE ── */}
        {inputMode === 'text' && (
          <div className="rounded-2xl p-5 shadow-sm"
            style={{ background: '#EDE9FF', border: '1px solid #C4B5FD' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: '#5B4FCF', color: '#fff' }}>AI</span>
              <p className="text-sm font-bold" style={{ color: '#5B4FCF' }}>AI Smart Paste</p>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(91,79,207,0.15)', color: '#5B4FCF' }}>BETA</span>
            </div>
            <p className="text-xs mb-3" style={{ color: '#6D5ED4' }}>
              Paste supplier text and AI will auto-fill the form below
            </p>
            <div className="flex gap-2">
              <textarea
                rows={3}
                placeholder="e.g. 'Premium Denim Jeans 50 pcs 650 taka'"
                className="flex-1 p-3 rounded-xl text-sm outline-none resize-none"
                style={{
                  border: '1px solid #C4B5FD',
                  background: 'rgba(255,255,255,0.7)',
                  color: '#0F1F3D'
                }}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              />
              <button
                onClick={handleMagicFill}
                disabled={isThinking}
                className="px-4 py-2 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center gap-2"
                style={{ background: '#5B4FCF', color: '#fff' }}
              >
                {isThinking ? '⚙️ Parsing...' : '✨ Auto-Fill'}
              </button>
            </div>
          </div>
        )}

        {/* ── OCR MODE ── */}
        {inputMode === 'image' && (
          <div className="rounded-2xl p-5 shadow-sm"
            style={{ background: '#EBF1FF', border: '1px solid #B8CEEE' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: '#2E5BA8', color: '#fff' }}>AI</span>
              <p className="text-sm font-bold" style={{ color: '#2E5BA8' }}>OCR Image Scanner</p>
            </div>
            <p className="text-xs mb-4" style={{ color: '#4A6080' }}>
              Upload a product image or invoice — AI will extract all details
            </p>
            <ImageUploadOCR onDataExtracted={handleImageDataExtracted} />
          </div>
        )}

        {/* ── BULK MODE ── */}
        {inputMode === 'bulk' && (
          <div className="rounded-2xl p-5 shadow-sm"
            style={{ background: '#FFF8E6', border: '1px solid #FFE9A0' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: '#9A6F00', color: '#fff' }}>BULK</span>
              <p className="text-sm font-bold" style={{ color: '#9A6F00' }}>Bulk Supplier Import</p>
            </div>
            <p className="text-xs mb-3" style={{ color: '#7A5800' }}>
              Paste multiple products at once — AI will extract each item
            </p>
            <div className="flex gap-2">
              <textarea
                rows={4}
                placeholder="e.g. 'Red shirt 50 pcs 500tk, Blue jeans 30 pcs 800tk, Black jacket 20 pcs 1200tk'"
                className="flex-1 p-3 rounded-xl text-sm outline-none resize-none"
                style={{
                  border: '1px solid #FFE9A0',
                  background: 'rgba(255,255,255,0.7)',
                  color: '#0F1F3D'
                }}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              />
              <button
                onClick={handleBulkParse}
                disabled={isBulkThinking}
                className="px-4 py-2 rounded-xl text-sm font-bold transition disabled:opacity-50"
                style={{ background: '#9A6F00', color: '#fff' }}
              >
                {isBulkThinking ? '⚙️ Extracting...' : '📦 Extract Items'}
              </button>
            </div>
          </div>
        )}

        {/* ── BULK REVIEW TABLE ── */}
        {inputMode === 'bulk' && bulkItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(15,31,61,0.06)', background: '#F6F8FC' }}>
              <p className="text-sm font-bold" style={{ color: '#0F1F3D' }}>
                Review {bulkItems.length} Extracted Items
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F6F8FC', borderBottom: '1px solid rgba(15,31,61,0.06)' }}>
                    {['#', 'Name', 'Qty', 'Buying Price', 'Category', 'Total', 'Remove'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: '#6D7690' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkItems.map((item, index) => (
                    <tr key={`${item?.name || 'item'}-${index}`}
                      style={{ borderBottom: '1px solid rgba(15,31,61,0.04)' }}>
                      <td className="px-4 py-3 text-xs" style={{ color: '#6D7690' }}>{index + 1}</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: '#0F1F3D' }}>
                        {item?.name || '(Unnamed)'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#6D7690' }}>
                        {item?.quantity ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#6D7690' }}>
                        ৳{item?.buyingPrice ?? item?.price ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#6D7690' }}>
                        {item?.category || 'Other'}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: '#0F1F3D' }}>
                        ৳{(toNumber(item?.buyingPrice ?? item?.price ?? 0) * toNumber(item?.quantity ?? 1)).toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemoveBulkItem(index)}
                          className="text-xs font-bold px-2 py-1 rounded-lg transition"
                          style={{ background: '#FEF0F0', color: '#D94040' }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Bulk Supplier Info */}
            <div className="p-5" style={{ borderTop: '1px solid rgba(15,31,61,0.06)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#6D7690' }}>
                Supplier Info
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#6D7690' }}>Supplier Name</label>
                  <input
                    className="w-full p-2.5 rounded-lg text-sm font-semibold outline-none"
                    style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                    value={bulkSupplier.supplierName}
                    onChange={(e) => setBulkSupplier({ ...bulkSupplier, supplierName: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#6D7690' }}>Invoice Number</label>
                  <input
                    className="w-full p-2.5 rounded-lg text-sm font-semibold outline-none"
                    style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                    value={bulkSupplier.invoiceNumber}
                    onChange={(e) => setBulkSupplier({ ...bulkSupplier, invoiceNumber: e.target.value })}
                    placeholder="Invoice #"
                  />
                </div>
              </div>
              <button
                onClick={handleBulkSave}
                className="mt-4 w-full py-3 rounded-xl text-sm font-extrabold transition"
                style={{ background: '#0F1F3D', color: '#E8B84B' }}
              >
                ✅ Confirm & Save All {bulkItems.length} Products
              </button>
            </div>
          </div>
        )}

        {/* ── MANUAL FORM (shown in text + image modes) ── */}
        {inputMode !== 'bulk' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* LEFT COLUMN — Identity */}
            <div className="space-y-4">

              {/* Product Identity Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm"
                style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-4"
                  style={{ color: '#6D7690' }}>Product Identity</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>
                      Product Name <span style={{ color: '#D94040' }}>*</span>
                    </label>
                    <input
                      className="w-full p-2.5 rounded-xl text-sm font-semibold outline-none transition-colors"
                      style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Cotton T-Shirt"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>Category</label>
                      <input
                        list="category-options"
                        className="w-full p-2.5 rounded-xl text-sm font-semibold outline-none bg-white"
                        style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Select category"
                      />
                      <datalist id="category-options">
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>Subcategory</label>
                      <input
                        className="w-full p-2.5 rounded-xl text-sm font-semibold outline-none"
                        style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        placeholder="e.g. Sneakers"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>SKU</label>
                      <input
                        className="w-full p-2.5 rounded-xl text-sm font-mono outline-none"
                        style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="SKU-001"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>Batch Number</label>
                      <input
                        className="w-full p-2.5 rounded-xl text-sm font-mono outline-none"
                        style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                        value={formData.batchNumber}
                        onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                        placeholder="Batch-01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>Unit</label>
                      <input
                        className="w-full p-2.5 rounded-xl text-sm font-semibold outline-none"
                        style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="pcs / kg / box"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>Expiry Date</label>
                      <input
                        type="date"
                        className="w-full p-2.5 rounded-xl text-sm outline-none"
                        style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>Stock Notes</label>
                    <textarea
                      rows={2}
                      className="w-full p-2.5 rounded-xl text-sm outline-none resize-none"
                      style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                      value={formData.stockNotes}
                      onChange={(e) => setFormData({ ...formData, stockNotes: e.target.value })}
                      placeholder="Storage notes or conditions"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm"
                style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-4"
                  style={{ color: '#6D7690' }}>Supplier Information</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>Supplier Name</label>
                    <input
                      className="w-full p-2.5 rounded-xl text-sm font-semibold outline-none"
                      style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Supplier or vendor name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>Supplier Phone</label>
                      <input
                        className="w-full p-2.5 rounded-xl text-sm outline-none"
                        style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                        value={formData.supplierPhone}
                        onChange={(e) => setFormData({ ...formData, supplierPhone: e.target.value })}
                        placeholder="01XXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>Invoice Number</label>
                      <input
                        className="w-full p-2.5 rounded-xl text-sm outline-none"
                        style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        placeholder="Invoice #"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* User Info Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm"
                style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-4"
                  style={{ color: '#6D7690' }}>Entry Info</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>Added By</label>
                    <input
                      className="w-full p-2.5 rounded-xl text-sm outline-none"
                      style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                      value={formData.addedBy}
                      onChange={(e) => setFormData({ ...formData, addedBy: e.target.value })}
                      placeholder="Auto-filled on save"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>User Phone</label>
                    <input
                      className="w-full p-2.5 rounded-xl text-sm outline-none"
                      style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                      value={formData.userPhone}
                      onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                      placeholder="Your phone"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — Economics */}
            <div className="space-y-4">

              {/* Live Profit Preview */}
              {formData.buyingPrice && formData.sellingPrice && (
                <div className="rounded-2xl p-5 shadow-sm"
                  style={{
                    background: toNumber(formData.sellingPrice) > toNumber(formData.buyingPrice)
                      ? '#E6F7EF' : '#FEF0F0',
                    border: `1px solid ${toNumber(formData.sellingPrice) > toNumber(formData.buyingPrice)
                      ? '#B6EDD4' : '#FCCFCF'}`
                  }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: toNumber(formData.sellingPrice) > toNumber(formData.buyingPrice) ? '#0D7A4E' : '#D94040' }}>
                    Live Profit Preview
                  </p>
                  <p className="text-3xl font-extrabold"
                    style={{ color: toNumber(formData.sellingPrice) > toNumber(formData.buyingPrice) ? '#0D7A4E' : '#D94040' }}>
                    ৳{(toNumber(formData.sellingPrice) - toNumber(formData.buyingPrice) - toNumber(formData.packaging)).toFixed(0)}
                    <span className="text-sm font-semibold ml-1">per unit</span>
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-xs" style={{ color: '#4A6080' }}>
                      Margin: {toNumber(formData.sellingPrice) > 0
                        ? (((toNumber(formData.sellingPrice) - toNumber(formData.buyingPrice) - toNumber(formData.packaging)) / toNumber(formData.sellingPrice)) * 100).toFixed(1)
                        : 0}%
                    </p>
                    <p className="text-xs" style={{ color: '#4A6080' }}>
                      Stock Value: ৳{(toNumber(formData.buyingPrice) * toNumber(formData.quantity)).toFixed(0)}
                    </p>
                  </div>
                </div>
              )}

              {/* Pricing Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm"
                style={{ border: '1px solid rgba(15,31,61,0.09)' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-4"
                  style={{ color: '#6D7690' }}>Pricing & Stock</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#D94040' }}>
                        Buying Price <span style={{ color: '#D94040' }}>*</span>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2.5 rounded-xl text-sm font-bold outline-none"
                        style={{ border: '1.5px solid #FCCFCF', color: '#D94040', background: '#FFF5F5' }}
                        value={formData.buyingPrice}
                        onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
                        placeholder="৳ 0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#1A9E6A' }}>
                        Selling Price
                      </label>
                      <input
                        type="number"
                        className="w-full p-2.5 rounded-xl text-sm font-bold outline-none"
                        style={{ border: '1.5px solid #B6EDD4', color: '#1A9E6A', background: '#F0FBF6' }}
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                        placeholder="৳ 0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>
                        Quantity
                      </label>
                      <input
                        type="number"
                        className="w-full p-2.5 rounded-xl text-sm font-bold outline-none"
                        style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>
                        Discount Price
                      </label>
                      <input
                        type="number"
                        className="w-full p-2.5 rounded-xl text-sm font-bold outline-none"
                        style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                        value={formData.discountPrice}
                        onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                        placeholder="৳ 0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: '#0F1F3D' }}>
                      Packaging Cost
                    </label>
                    <input
                      type="number"
                      className="w-full p-2.5 rounded-xl text-sm font-bold outline-none"
                      style={{ border: '1px solid rgba(15,31,61,0.12)', color: '#0F1F3D' }}
                      value={formData.packaging}
                      onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
                      placeholder="৳ 0"
                    />
                    <p className="text-[10px] mt-1" style={{ color: '#8BA0BC' }}>
                      Per unit packaging — deducted from profit calculation
                    </p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                className="w-full py-4 rounded-2xl text-base font-extrabold transition-all shadow-lg"
                style={{ background: '#0F1F3D', color: '#E8B84B' }}
              >
                📥 Save to Inventory
              </button>

              {/* Quick tip */}
              <div className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(15,31,61,0.04)' }}>
                <p className="text-[11px]" style={{ color: '#6D7690' }}>
                  💡 Tip: Selling Price and Supplier can be added later from Inventory List
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AddInventory;
