/* src/components/ImageUploadOCR.jsx */
import React, { useState } from "react";
import { parseProductFromImage } from "../services/aiService";

const ImageUploadOCR = ({ onDataExtracted, multiple = false }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [imageQueue, setImageQueue] = useState([]);
  const [queueProgress, setQueueProgress] = useState(0);

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("❌ Please select an image file (PNG, JPG, WebP, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("❌ Image is too large. Please select an image under 5MB.");
      return;
    }

    setSelectedImage(file);

    if (multiple && e.target.files.length > 1) {
      const files = Array.from(e.target.files);
      setImageQueue(files.map(f => URL.createObjectURL(f)));
      setQueueProgress(0);
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Extract product data from image using Gemini Vision
  const handleExtractFromImage = async () => {
    if (!selectedImage) {
      alert("Please select an image first.");
      return;
    }

    setIsExtracting(true);
    console.log("🔍 Starting image OCR...");

    try {
      const extractedData = await parseProductFromImage(selectedImage);

      if (extractedData) {
        console.log("✅ Successfully extracted:", extractedData);
        
        // Show what was extracted
        const summary = `
          📦 Product: ${extractedData.identity?.name || "N/A"}
          💰 Price: ${extractedData.pricing?.selling_price ?? extractedData.pricing?.discount_price ?? "N/A"} tk
          📊 Qty: ${extractedData.inventory?.quantity ?? "N/A"}
          🎨 Color: ${extractedData.variant?.color || "N/A"}
          📂 Category: ${extractedData.classification?.category || "N/A"}
        `;
        console.log(summary);

        // Pass data to parent component
        if (onDataExtracted) {
          onDataExtracted(extractedData);
        }

        // Reset form
        setSelectedImage(null);
        setImagePreview(null);
        alert("✅ Image processed! Form fields updated.");
      } else {
        alert("❌ Could not extract data from image. Try a clearer photo.");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      alert("❌ Image processing failed: " + error.message);
    } finally {
      setIsExtracting(false);
    }
  };

  // Clear selected image
  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ background: "#5B4FCF" }}>
          IMAGE OCR
        </span>
        <span className="text-xs font-bold" style={{ color: "#0F1F3D" }}>
          Extract from Product Image
        </span>
      </div>

      {/* File Input */}
      <label className="flex flex-col items-center justify-center gap-3
        rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200
        border-slate-200 hover:border-yellow-400 hover:bg-yellow-50">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(15,31,61,0.07)" }}>
            <span className="text-2xl">📷</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-700 text-sm font-semibold">
            Upload Invoice or Receipt
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Click to browse or drag and drop
          </p>
          <p className="text-slate-400 text-[11px] mt-1">
            PNG, JPG, WebP · Max 5MB
          </p>
        </div>
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleImageSelect}
          disabled={isExtracting}
          className="hidden"
        />
      </label>

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-4 relative">
          <div className="border-2 border-blue-300 rounded-lg overflow-hidden bg-white p-2">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-40 object-contain rounded"
            />
          </div>
          <div className="text-xs text-gray-600 mt-2">
            ✅ Image selected and ready for OCR
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleExtractFromImage}
          disabled={!selectedImage || isExtracting}
          className="w-full py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: "#0F1F3D", color: "#E8B84B" }}
        >
          {isExtracting ? (
            <>
              <span className="animate-spin">⚙️</span>
              Extracting...
            </>
          ) : (
            <>🔍 Extract with AI</>
          )}
        </button>

        {imagePreview && (
          <button
            onClick={handleClearImage}
            disabled={isExtracting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="rounded-xl p-3 border border-slate-100 bg-slate-50">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Tips for best results
        </p>
        <div className="space-y-1">
          {[
            "Use clear, well-lit photos of product labels or packaging",
            "Ensure text is readable — not blurry or too small",
            "Include price tags, brand names and quantity info",
            "Works with product photos, invoices and supplier messages"
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-yellow-400 text-xs mt-0.5">✦</span>
              <p className="text-[11px] text-slate-500">{tip}</p>
            </div>
          ))}
        </div>
      </div>
      {multiple && imageQueue.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {imageQueue.map((src, i) => (
            <div key={i} className="relative">
              <img
                src={src}
                alt={`scan-${i}`}
                className="w-16 h-16 object-cover rounded-xl border-2 border-slate-200"
              />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                style={{ background: "#E8B84B", color: "#0F1F3D" }}>
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploadOCR;
