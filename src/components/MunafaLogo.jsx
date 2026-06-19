import React from "react";

// MunafaOS logo — variant 01 (Open Arrow). Left M leg white, right leg+arrowhead gold.
const MunafaLogo = ({ size = 40, showWordmark = false, onDark = false }) => {
  const iconSize = size;

  const icon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect width="100" height="100" rx="22" fill="#0F1F3D" />
      {/* Left leg of M – white */}
      <polyline
        points="28,70 28,32 50,55"
        stroke="#FFFFFF"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right leg / diagonal – gold */}
      <polyline
        points="50,55 72,28"
        stroke="#E8B84B"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrowhead – gold */}
      <polyline
        points="58,28 72,28 72,42"
        stroke="#E8B84B"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!showWordmark) return icon;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {icon}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: Math.round(iconSize * 0.55),
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ color: onDark ? "#FFFFFF" : "#0F1F3D" }}>Munafa</span>
          <span style={{ color: "#E8B84B" }}>OS</span>
        </span>
        <span
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 600,
            fontSize: Math.round(iconSize * 0.22),
            letterSpacing: "0.32em",
            color: "#9AA3B5",
            marginTop: 4,
          }}
        >
          PROFIT OPTIMIZER
        </span>
      </div>
    </div>
  );
};

export default MunafaLogo;
