import React, { useState, useEffect, useRef } from "react";
import ImageUploadOCR from "../components/ImageUploadOCR";
import { CATEGORY_OPTIONS } from "../../../shared/utils/categories";
import { db } from "../../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../auth/context/AuthContext";
import { logAudit } from "../../../shared/utils/auditLogger";
import { useNavigate } from "react-router-dom";
import { ScanLine, CheckCircle2, RefreshCw, Sparkles, Eye, FileText, ChevronRight, Edit2, Copy, Zap } from "lucide-react";
import ConfirmModal from "../../../components/ConfirmModal";

const OCRScanner = () => {
  const { currentUser, workspaceId } = useAuth();
  const navigate = useNavigate();
  const [packagingCost, setPackagingCost] = useState(0);
  const [scanStatus, setScanStatus] = useState("idle"); // "idle" | "scanning" | "done"
  const [scanProgress, setScanProgress] = useState(0);
  const [editingField, setEditingField] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [extractedFields, setExtractedFields] = useState([]);
  const fileRef = useRef(null);
  const [recentScans, setRecentScans] = useState(() => {
    try {
      const stored = localStorage.getItem("munafaos_recent_scans");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "munafaos_recent_scans",
        JSON.stringify(recentScans)
      );
    } catch {
      console.warn("Could not persist recent scans");
    }
  }, [recentScans]);
  const [extraData, setExtraData] = useState({});
  const [selectedScan, setSelectedScan] = useState(null);
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
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: "success",
    title: "",
    subtitle: "",
    onConfirm: null
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

  const handleCopyField = (label, value) => {
    navigator.clipboard.writeText(value);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleImageDataExtracted = (extractedData) => {
    setScanStatus("done");
    setScanProgress(100);
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

    // Capture extra fields not in formData schema
    const knownKeys = [
      "name","buyingPrice","quantity","category","subcategory",
      "sku","batchNumber","unit","expiryDate","sellingPrice",
      "discountPrice","supplier","supplierPhone","invoiceNumber"
    ];
    const extras = {};
    const flatData = {
      ...extractedData.identity,
      ...extractedData.pricing,
      ...extractedData.inventory,
      ...extractedData.business,
      ...extractedData.classification
    };
    Object.entries(flatData || {}).forEach(([k, v]) => {
      if (v && String(v).trim() !== "" && !knownKeys.includes(k)) {
        extras[k] = String(v).trim();
      }
    });
    setExtraData(extras);

    // Add to recent scans history
    setRecentScans(prev => [{
      name: name || "Unknown Product",
      price: price || "—",
      time: new Date().toLocaleTimeString("en-BD", {
        hour: "2-digit", minute: "2-digit"
      }),
      fieldCount: Object.values(flatData).filter(v => v).length,
      snapshot: {
        name: name || "",
        buyingPrice: price || "",
        quantity: quantity || "",
        category: category || "",
        subcategory: String(extractedData.classification?.subcategory || ""),
        sku: String(extractedData.identity?.sku || ""),
        batchNumber: String(extractedData.inventory?.batch_number || ""),
        unit: String(extractedData.inventory?.unit || ""),
        expiryDate: String(extractedData.inventory?.expiry_date || ""),
        sellingPrice: String(extractedData.pricing?.selling_price || ""),
        discountPrice: String(extractedData.pricing?.discount_price || ""),
        supplier: String(extractedData.business?.supplier_name || ""),
        supplierPhone: String(extractedData.business?.supplier_phone || ""),
        invoiceNumber: String(extractedData.business?.invoice_number || ""),
      },
      extras: { ...extras }
    }, ...prev].slice(0, 5));
  };

  const handleSave = async () => {
    const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

    if (!currentUser || !effectiveWorkspaceId) return alert("Please login first.");
    if (!formData.name || !formData.buyingPrice) return alert("Fill required fields");

    const safeBuyingPrice = toNumber(formData.buyingPrice);
    const safeQuantity = toNumber(formData.quantity);
    const productName = String(formData.name || "").trim();
    const safeSellingPrice = toNumber(formData.sellingPrice);
    const safePackagingCost = toNumber(packagingCost);
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
        packaging: Number(safePackagingCost),
        discountPrice: safeDiscountPrice,

        supplier: String(formData.supplier || "").trim(),
        supplierPhone: String(formData.supplierPhone || "").trim(),
        invoiceNumber: String(formData.invoiceNumber || "").trim(),
        addedBy: safeAddedBy,
        userPhone: String(formData.userPhone || "").trim(),
        timestamp: serverTimestamp(),
        extraData: extraData,
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

      setConfirmModal({
        isOpen: true,
        type: "success",
        title: "Product Saved!",
        subtitle: "Some fields may still be empty. You can edit them from the Inventory List.",
        onConfirm: () => {
          setConfirmModal(m => ({ ...m, isOpen: false }));
          navigate("/inventory-list");
        }
      });
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
    } catch (error) {
      console.error("Error:", error);
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "Save Failed",
        subtitle: "Something went wrong. Please try again.",
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        title={confirmModal.title}
        subtitle={confirmModal.subtitle}
        confirmText="Go to Inventory"
        cancelText="Stay & Scan More"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(m => ({ ...m, isOpen: false }))}
      />

      {/* HERO BANNER */}
      <div className="rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #0F1F3D 0%, #1a3460 100%)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ScanLine size={16} className="text-yellow-300" />
            <span className="text-yellow-300 text-xs font-bold tracking-wider">AI OCR ENGINE · POWERED BY MUNAFA AI</span>
          </div>
          <h2 className="text-white text-lg font-bold">Invoice & Receipt Scanner</h2>
          <p className="text-blue-200 text-xs mt-1">Scan supplier invoices with AI — auto-extracts product name, price, quantity and saves to inventory.</p>
        </div>
        <div className="flex gap-3">
          <div className="px-3 py-2 rounded-xl text-center" style={{ background: "rgba(232,184,75,0.15)", border: "1px solid rgba(232,184,75,0.3)" }}>
            <p className="text-yellow-300 text-lg font-bold">99.2%</p>
            <p className="text-blue-200 text-xs">OCR Accuracy</p>
          </div>
          <div className="px-3 py-2 rounded-xl text-center" style={{ background: "rgba(232,184,75,0.15)", border: "1px solid rgba(232,184,75,0.3)" }}>
            <p className="text-yellow-300 text-lg font-bold">3s</p>
            <p className="text-blue-200 text-xs">Avg Scan Time</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT COLUMN */}
        <div className="space-y-4">

          {/* Always mounted — never conditionally hidden */}
          <div className={scanStatus === "idle" ? "block" : "hidden"}>
            <ImageUploadOCR
              onDataExtracted={handleImageDataExtracted}
              multiple={true}
            />
          </div>


          {/* SCANNING STATE */}
          {scanStatus === "scanning" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center gap-5">
              <div className="relative w-24 h-28 rounded-xl overflow-hidden bg-slate-100">
                <div className="absolute inset-0 flex flex-col gap-1.5 p-2">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-1.5 rounded bg-slate-200" style={{ width: `${60 + (i * 7) % 35}%` }} />
                  ))}
                </div>
                <div
                  className="absolute left-0 right-0 h-0.5 shadow-lg transition-all duration-100"
                  style={{ top: `${scanProgress}%`, background: "#E8B84B", boxShadow: "0 0 6px #E8B84B" }}
                />
              </div>
              <div className="w-full">
                <div className="flex justify-between text-xs text-slate-600 mb-2">
                  <span className="font-medium">AI scanning document…</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-100" style={{ width: `${scanProgress}%`, background: "#E8B84B" }} />
                </div>
              </div>
            </div>
          )}

          {/* DONE STATE */}
          {scanStatus === "done" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-green-500" />
                <span className="text-slate-700 text-sm font-semibold">Scan Complete</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-green-50 text-center">
                  <p className="text-green-700 text-sm font-bold">{formData.name ? "✓" : "—"}</p>
                  <p className="text-slate-500 text-[10px]">Product Name</p>
                </div>
                <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(15,31,61,0.05)" }}>
                  <p className="text-sm font-bold" style={{ color: "#0F1F3D" }}>{formData.buyingPrice || "—"}</p>
                  <p className="text-slate-500 text-[10px]">Buying Price</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-bold transition-colors"
                  style={{ background: "#E8B84B", color: "#0F1F3D" }}
                >
                  <Zap size={11} /> Save to Inventory
                </button>
                <button
                  onClick={() => { setScanStatus("idle"); setExtractedFields([]); }}
                  className="flex items-center justify-center p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
          )}

          {/* RECENT SCANS PLACEHOLDER */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <span className="text-slate-700 text-sm font-semibold">Recent Scans</span>
              <ChevronRight size={14} className="text-slate-400" />
            </div>
            <div className="divide-y divide-slate-50">
              {recentScans.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <FileText size={24} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs">No recent scans yet</p>
                </div>
              ) : (
                recentScans.map((scan, i) => (
                  <div key={i} onClick={() => setSelectedScan(scan)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(15,31,61,0.07)" }}>
                        <FileText size={12} style={{ color: "#0F1F3D" }} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-700 font-medium truncate max-w-[120px]">
                          {scan.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {scan.time} · {scan.fieldCount} fields
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold" style={{ color: "#E8B84B" }}>
                      ৳{scan.price}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Extracted Fields */}
        <div className="lg:col-span-2 space-y-4">
          {scanStatus === "done" ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} style={{ color: "#5B4FCF" }} />
                  <span className="text-slate-800 text-sm font-semibold">Extracted Product Data</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#5B4FCF" }}>AI</span>
                </div>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-colors"
                  style={{ background: "#0F1F3D" }}
                >
                  Save to Inventory
                </button>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Product Name", key: "name", required: true },
                  { label: "Buying Price (৳)", key: "buyingPrice", required: true },
                  { label: "Quantity", key: "quantity", required: false },
                  { label: "Selling Price (৳)", key: "sellingPrice", required: false },
                  { label: "Category", key: "category", required: false },
                  { label: "SKU", key: "sku", required: false },
                  { label: "Supplier", key: "supplier", required: false },
                  { label: "Invoice Number", key: "invoiceNumber", required: false },
                ].map((field) => (
                  <div key={field.key} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">
                        {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyField(field.label, formData[field.key] || "")}
                          className="p-1 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          {copiedField === field.label
                            ? <CheckCircle2 size={11} className="text-green-500" />
                            : <Copy size={11} />}
                        </button>
                        <button
                          onClick={() => setEditingField(editingField === field.key ? null : field.key)}
                          className="p-1 rounded-lg hover:bg-white text-slate-400 transition-colors"
                          style={{ color: editingField === field.key ? "#E8B84B" : undefined }}
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                    </div>
                    {editingField === field.key ? (
                      <input
                        autoFocus
                        defaultValue={formData[field.key] || ""}
                        onBlur={(e) => {
                          setFormData((prev) => ({ ...prev, [field.key]: e.target.value }));
                          setEditingField(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setFormData((prev) => ({ ...prev, [field.key]: e.target.value }));
                            setEditingField(null);
                          }
                        }}
                        className="w-full text-sm text-slate-800 bg-white border rounded-lg px-2 py-1 outline-none font-semibold"
                        style={{ borderColor: "#E8B84B" }}
                      />
                    ) : (
                      <p className={`text-sm font-semibold ${formData[field.key] ? "text-slate-800" : "text-slate-300"}`}>
                        {formData[field.key] || "Not detected"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {Object.keys(extraData).length > 0 && (
                <div className="px-5 pb-5">
                  <div className="rounded-xl p-4 border"
                    style={{ background: "rgba(91,79,207,0.04)", borderColor: "rgba(91,79,207,0.15)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={12} style={{ color: "#5B4FCF" }} />
                      <span className="text-xs font-bold" style={{ color: "#5B4FCF" }}>
                        ADDITIONAL EXTRACTED DATA
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        Saved to Firestore automatically
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(extraData).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">{k}:</span>
                          <span className="text-[11px] text-slate-700 font-semibold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4 min-h-[420px]">
              {scanStatus === "scanning" ? (
                <>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(15,31,61,0.06)" }}>
                    <ScanLine size={24} className="animate-pulse" style={{ color: "#0F1F3D" }} />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-600 text-sm font-semibold">Reading document…</p>
                    <p className="text-slate-400 text-xs mt-1">AI is extracting product details</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(15,31,61,0.05)" }}>
                    <ScanLine size={24} className="text-slate-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500 text-sm">No document scanned yet</p>
                    <p className="text-slate-400 text-xs mt-1">Upload a supplier invoice or product photo to extract data automatically</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {["Supplier invoices", "Product photos", "Purchase receipts"].map((t) => (
                      <span key={t} className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-xs text-slate-500">{t}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SCAN DETAIL SLIDE-IN PANEL */}
      {selectedScan && (
        <div className="fixed inset-0 z-50 flex justify-end"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={() => setSelectedScan(null)}>
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>

            {/* Panel Header */}
            <div className="sticky top-0 z-10 px-5 py-4 border-b border-slate-100 flex items-center justify-between"
              style={{ background: "#0F1F3D" }}>
              <div>
                <p className="text-white text-sm font-bold truncate max-w-[220px]">
                  {selectedScan.name}
                </p>
                <p className="text-blue-200 text-xs mt-0.5">
                  Scanned at {selectedScan.time} · {selectedScan.fieldCount} fields
                </p>
              </div>
              <button
                onClick={() => setSelectedScan(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors text-lg font-bold">
                ×
              </button>
            </div>

            {/* Load into Form Button */}
            <div className="px-5 py-3 border-b border-slate-100"
              style={{ background: "rgba(232,184,75,0.08)" }}>
              <button
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    ...selectedScan.snapshot
                  }));
                  setExtraData(selectedScan.extras || {});
                  setScanStatus("done");
                  setSelectedScan(null);
                }}
                className="w-full py-2 rounded-xl text-sm font-bold transition-colors"
                style={{ background: "#E8B84B", color: "#0F1F3D" }}>
                ⚡ Load into Form
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                Loads this scan back into the editor so you can save it
              </p>
            </div>

            {/* Main Fields */}
            <div className="p-5 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Extracted Fields
              </p>
              {[
                { label: "Product Name", key: "name" },
                { label: "Buying Price (৳)", key: "buyingPrice" },
                { label: "Quantity", key: "quantity" },
                { label: "Selling Price (৳)", key: "sellingPrice" },
                { label: "Category", key: "category" },
                { label: "SKU", key: "sku" },
                { label: "Supplier", key: "supplier" },
                { label: "Invoice Number", key: "invoiceNumber" },
                { label: "Batch Number", key: "batchNumber" },
                { label: "Unit", key: "unit" },
                { label: "Expiry Date", key: "expiryDate" },
                { label: "Supplier Phone", key: "supplierPhone" },
              ].map(({ label, key }) => (
                selectedScan.snapshot[key] ? (
                  <div key={key}
                    className="flex items-start justify-between py-2.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400 font-medium w-36 shrink-0">
                      {label}
                    </span>
                    <span className="text-xs text-slate-800 font-semibold text-right">
                      {selectedScan.snapshot[key]}
                    </span>
                  </div>
                ) : null
              ))}
            </div>

            {/* Extra Data */}
            {Object.keys(selectedScan.extras || {}).length > 0 && (
              <div className="px-5 pb-6">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-3"
                  style={{ color: "#5B4FCF" }}>
                  Additional Data
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedScan.extras).map(([k, v]) => (
                    <div key={k}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        {k}:
                      </span>
                      <span className="text-[11px] text-slate-700 font-semibold">
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRScanner;
