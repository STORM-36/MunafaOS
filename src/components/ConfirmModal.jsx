import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, X,
         ArrowRight, Plus, Sparkles } from "lucide-react";

const ConfirmModal = ({
  isOpen,
  type = "success",      // "success" | "confirm" | "error"
  title,
  subtitle,
  missingFields = [],    // array of missing field names
  confirmText = "Continue",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  productName,
}) => {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setTimeout(() => setAnimateIn(true), 10);
    } else {
      setAnimateIn(false);
      setTimeout(() => setVisible(false), 300);
    }
  }, [isOpen]);

  if (!visible) return null;

  const config = {
    success: {
      icon: <CheckCircle2 size={28} className="text-green-400" />,
      iconBg: "rgba(34,197,94,0.15)",
      accentColor: "#22C55E",
      headerBg: "linear-gradient(135deg, #0F1F3D 0%, #1a3460 100%)",
      badge: "SAVED SUCCESSFULLY",
      badgeColor: "rgba(232,184,75,0.2)",
      badgeText: "#E8B84B",
    },
    confirm: {
      icon: <AlertTriangle size={28} className="text-amber-400" />,
      iconBg: "rgba(251,191,36,0.15)",
      accentColor: "#F59E0B",
      headerBg: "linear-gradient(135deg, #1a0f0f 0%, #3d1f1f 100%)",
      badge: "CONFIRM ACTION",
      badgeColor: "rgba(251,191,36,0.2)",
      badgeText: "#F59E0B",
    },
    error: {
      icon: <XCircle size={28} className="text-red-400" />,
      iconBg: "rgba(239,68,68,0.15)",
      accentColor: "#EF4444",
      headerBg: "linear-gradient(135deg, #1a0f0f 0%, #3d1515 100%)",
      badge: "ERROR",
      badgeColor: "rgba(239,68,68,0.2)",
      badgeText: "#EF4444",
    },
  };

  const c = config[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: animateIn ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
        backdropFilter: animateIn ? "blur(4px)" : "none",
        transition: "all 0.3s ease",
      }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          transform: animateIn ? "scale(1) translateY(0)" : "scale(0.9) translateY(20px)",
          opacity: animateIn ? 1 : 0,
          transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 relative" style={{ background: c.headerBg }}>

          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <X size={14} className="text-white" />
          </button>

          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={11} style={{ color: c.badgeText }} />
            <span
              className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: c.badgeColor, color: c.badgeText }}
            >
              {c.badge}
            </span>
          </div>

          {/* Icon + Title */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: c.iconBg }}
            >
              {c.icon}
            </div>
            <div>
              <h3 className="text-white text-base font-bold leading-tight">
                {title}
              </h3>
              {productName && (
                <p className="text-blue-200 text-xs mt-0.5 font-medium">
                  {productName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-4 space-y-3">

          {/* Subtitle */}
          {subtitle && (
            <p className="text-slate-500 text-sm leading-relaxed">
              {subtitle}
            </p>
          )}

          {/* Missing Fields — only for success type */}
          {type === "success" && missingFields.length > 0 && (
            <div
              className="rounded-xl p-3 border"
              style={{
                background: "rgba(251,191,36,0.06)",
                borderColor: "rgba(251,191,36,0.25)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={11} className="text-amber-500" />
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  {missingFields.length} field{missingFields.length > 1 ? "s" : ""} need attention
                </span>
              </div>
              <div className="space-y-1">
                {missingFields.map((field, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: "#F59E0B" }}
                    />
                    <span className="text-xs text-slate-600 font-medium">
                      {field}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                These help with profit tracking and supplier management
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            {onCancel && cancelText && (
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: "#0F1F3D", color: "#E8B84B" }}
            >
              {type === "success" && <ArrowRight size={14} />}
              {type === "confirm" && <AlertTriangle size={14} />}
              {confirmText}
            </button>
          </div>

          {/* Add Another — only for success */}
          {type === "success" && (
            <button
              onClick={() => { onCancel && onCancel(); }}
              className="w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus size={12} />
              Add Another Product
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
