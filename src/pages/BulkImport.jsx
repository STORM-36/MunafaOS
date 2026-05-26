import React, { useState } from "react";
import { parseMultipleProductsWithAI } from "../services/aiService";
import { CATEGORY_OPTIONS } from "../utils/categories";
import { db } from "../firebase";
import { collection, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { logAudit } from "../utils/auditLogger";
import { useNavigate } from "react-router-dom";
import { Upload, Sparkles, Brain, CheckCircle2, RefreshCw, Zap, FileText, X } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";

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
  const [activeTab, setActiveTab] = useState("text");
  const [activeStep, setActiveStep] = useState(1);
  const [dragOver, setDragOver] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmSubtitle, setConfirmSubtitle] = useState("");

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
    setActiveStep(2);
    const items = await parseMultipleProductsWithAI(aiInput);

    if (Array.isArray(items) && items.length > 0) {
      setBulkItems(items);
      setActiveStep(3);
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
      setConfirmTitle(`${bulkCount} product(s) saved!`);
      setConfirmSubtitle("Some fields like Selling Price may be empty. Edit them from Inventory List.");
      setShowConfirm(true);
      setBulkItems([]);
      setAiInput("");
      setBulkSupplier({ supplierName: "", invoiceNumber: "" });
    } catch (error) {
      console.error("Error saving bulk items:", error);
      alert("❌ Failed to save bulk items.");
    }
  };

  return (
  <div className="p-4 sm:p-6 space-y-5">

    <ConfirmModal
      isOpen={showConfirm}
      type="success"
      title={confirmTitle}
      subtitle={confirmSubtitle}
      confirmText="Go to Inventory"
      cancelText="Add More"
      onConfirm={() => { setShowConfirm(false); navigate("/inventory-list"); }}
      onCancel={() => {
        setShowConfirm(false);
        setBulkItems([]);
        setAiInput("");
        setBulkSupplier({ supplierName: "", invoiceNumber: "" });
        setActiveStep(1);
      }}
    />

    {/* Hero Banner */}
    <div className="rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      style={{ background: "linear-gradient(135deg, #0F1F3D 0%, #1a3460 100%)" }}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain size={16} style={{ color: "#a78bfa" }} />
          <span className="text-xs font-bold tracking-wider" style={{ color: "#a78bfa" }}>
            AI-POWERED IMPORT
          </span>
        </div>
        <h2 className="text-white text-lg font-bold">Bulk Inventory Import</h2>
        <p className="text-xs mt-1" style={{ color: "#93c5fd" }}>
          Paste supplier text or upload a file — AI extracts and saves all products instantly.
        </p>
      </div>
      <div className="flex gap-3">
        <div className="px-3 py-2 rounded-xl text-center"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <p className="text-white text-lg font-bold">3</p>
          <p className="text-xs" style={{ color: "#93c5fd" }}>tokens/use</p>
        </div>
        <div className="px-3 py-2 rounded-xl text-center"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <p className="text-white text-lg font-bold">&lt;10s</p>
          <p className="text-xs" style={{ color: "#93c5fd" }}>Parse time</p>
        </div>
      </div>
    </div>

    {/* Stepper */}
    <div className="bg-white rounded-2xl border p-5"
      style={{ borderColor: "rgba(15,31,61,0.09)" }}>
      <div className="flex items-center justify-between">
        {[
          { n: 1, label: "Input" },
          { n: 2, label: "Parsing" },
          { n: 3, label: "Review" },
          { n: 4, label: "Saved" },
        ].map((s, i, arr) => (
          <div key={s.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  background: activeStep > s.n ? "#22C55E" : activeStep === s.n ? "#0F1F3D" : "#f1f5f9",
                  color: activeStep >= s.n ? "#fff" : "#94a3b8"
                }}>
                {activeStep > s.n ? <CheckCircle2 size={16} /> : s.n}
              </div>
              <span className="text-[11px] mt-1 whitespace-nowrap"
                style={{
                  color: activeStep >= s.n ? "#0F1F3D" : "#94a3b8",
                  fontWeight: activeStep === s.n ? 600 : 400
                }}>
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-4 transition-all duration-300"
                style={{ background: activeStep > s.n ? "#22C55E" : "#f1f5f9" }} />
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Main Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* LEFT — Input Panel */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border p-4 space-y-4"
          style={{ borderColor: "rgba(15,31,61,0.09)" }}>

          {/* Tab Switcher */}
          <div className="flex rounded-xl overflow-hidden border"
            style={{ borderColor: "rgba(15,31,61,0.09)" }}>
            <button
              onClick={() => setActiveTab("text")}
              className="flex-1 py-2 text-xs font-bold transition-all"
              style={{
                background: activeTab === "text" ? "#0F1F3D" : "#f8fafc",
                color: activeTab === "text" ? "#E8B84B" : "#64748b"
              }}>
              📝 Paste Text
            </button>
            <button
              onClick={() => setActiveTab("file")}
              className="flex-1 py-2 text-xs font-bold transition-all"
              style={{
                background: activeTab === "file" ? "#0F1F3D" : "#f8fafc",
                color: activeTab === "file" ? "#E8B84B" : "#64748b"
              }}>
              📁 Upload File
            </button>
          </div>

          {/* Text Mode */}
          {activeTab === "text" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Brain size={13} style={{ color: "#5B4FCF" }} />
                <span className="text-xs font-bold tracking-wider" style={{ color: "#5B4FCF" }}>
                  AI TEXT PARSER
                </span>
              </div>
              <textarea
                rows={5}
                placeholder="e.g. 'Red shirt 50 pcs ৳500, Blue jeans 30 pcs ৳800'"
                className="w-full p-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2"
                style={{ border: "1.5px solid rgba(15,31,61,0.12)", background: "#f8fafc" }}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              />
              <button
                onClick={handleBulkParse}
                disabled={isBulkThinking}
                className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "#0F1F3D", color: "#E8B84B" }}>
                {isBulkThinking
                  ? <><RefreshCw size={14} className="animate-spin" /> Parsing...</>
                  : <><Zap size={14} /> Extract Items</>}
              </button>
            </div>
          )}

          {/* File Mode */}
          {activeTab === "file" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
              className="rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3"
              style={{
                borderColor: dragOver ? "#E8B84B" : "rgba(15,31,61,0.15)",
                background: dragOver ? "rgba(232,184,75,0.05)" : "#f8fafc"
              }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(15,31,61,0.06)" }}>
                <Upload size={22} style={{ color: "#0F1F3D" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "#0F1F3D" }}>Drop your file here</p>
                <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>or click to browse</p>
                <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>.xlsx, .csv supported</p>
              </div>
              <span className="text-[11px] px-3 py-1 rounded-full font-semibold"
                style={{ background: "rgba(232,184,75,0.15)", color: "#b45309" }}>
                Coming Soon
              </span>
            </div>
          )}
        </div>

        {/* Supplier Info */}
        {bulkItems.length > 0 && (
          <div className="bg-white rounded-2xl border p-4 space-y-3"
            style={{ borderColor: "rgba(15,31,61,0.09)" }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#0F1F3D" }}>
              🏭 Supplier Info
            </p>
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400">Supplier Name</label>
              <input
                className="w-full mt-1 p-2 rounded-lg text-sm font-semibold focus:outline-none"
                style={{ border: "1.5px solid rgba(15,31,61,0.12)", color: "#0F1F3D" }}
                value={bulkSupplier.supplierName}
                onChange={(e) => setBulkSupplier({ ...bulkSupplier, supplierName: e.target.value })}
                placeholder="Supplier name"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400">Invoice Number</label>
              <input
                className="w-full mt-1 p-2 rounded-lg text-sm font-semibold focus:outline-none"
                style={{ border: "1.5px solid rgba(15,31,61,0.12)", color: "#0F1F3D" }}
                value={bulkSupplier.invoiceNumber}
                onChange={(e) => setBulkSupplier({ ...bulkSupplier, invoiceNumber: e.target.value })}
                placeholder="Invoice #"
              />
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — Preview Panel */}
      <div className="lg:col-span-2 space-y-4">
        {bulkItems.length > 0 ? (
          <div className="bg-white rounded-2xl border overflow-hidden"
            style={{ borderColor: "rgba(15,31,61,0.09)" }}>

            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "rgba(15,31,61,0.09)" }}>
              <div className="flex items-center gap-2">
                <Sparkles size={14} style={{ color: "#5B4FCF" }} />
                <span className="text-sm font-bold" style={{ color: "#0F1F3D" }}>AI-Parsed Preview</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: "rgba(91,79,207,0.1)", color: "#5B4FCF" }}>
                  {bulkItems.length} items
                </span>
              </div>
              <button
                onClick={handleBulkSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{ background: "#0F1F3D", color: "#E8B84B" }}>
                <Zap size={12} /> Confirm & Save All
              </button>
            </div>

            {/* Missing Price Warning */}
            {(() => {
              const missingPrice = bulkItems.filter(
                (item) => !toNumber(item?.sellingPrice ?? item?.price ?? item?.buyingPrice ?? 0)
              ).length;
              return missingPrice > 0 ? (
                <div className="mx-5 mt-4 rounded-xl px-4 py-3 border"
                  style={{ background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.25)" }}>
                  <p className="text-sm font-semibold" style={{ color: "#b45309" }}>
                    ⚠️ {missingPrice} of {bulkItems.length} product(s) have no selling price.
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#92400e" }}>
                    You can edit them after saving from the inventory list.
                  </p>
                </div>
              ) : null;
            })()}

            {/* Table */}
            <div className="overflow-x-auto p-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "#0F1F3D" }}>
                    {["#", "Product", "Qty", "Buying Price ৳", "Category", "Total ৳", ""].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 text-[11px] font-bold"
                        style={{ color: "#E8B84B" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkItems.map((item, index) => (
                    <tr key={`${item?.name || "item"}-${index}`}
                      className="border-b transition-colors hover:bg-slate-50"
                      style={{ borderColor: "rgba(15,31,61,0.06)" }}>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#94a3b8" }}>{index + 1}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: "#0F1F3D" }}>
                        {item?.name || "(Unnamed)"}
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#475569" }}>
                        {item?.quantity ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: "#0F1F3D" }}>
                        ৳{item?.buyingPrice ?? item?.cost_price ?? item?.price ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#475569" }}>
                        {item?.category || "Other"}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: "#0F1F3D" }}>
                        ৳{(() => {
                          const unitPrice = toNumber(item?.buyingPrice ?? item?.cost_price ?? 0);
                          const qty = toNumber(item?.quantity ?? 1);
                          return (unitPrice * (qty || 1)).toFixed(2);
                        })()}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleRemoveBulkItem(index)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                          title="Remove">
                          <X size={12} className="text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border p-10 flex flex-col items-center justify-center gap-4 min-h-[300px]"
            style={{ borderColor: "rgba(15,31,61,0.09)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "#f8fafc" }}>
              <FileText size={24} style={{ color: "#cbd5e1" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "#64748b" }}>No items parsed yet</p>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                Paste supplier text on the left and click Extract Items.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default BulkImport;
