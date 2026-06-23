import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const typeConfig = {
  success: { Icon: CheckCircle2, accent: '#22C55E', tintBg: 'rgba(34,197,94,0.15)',  softBg: '#F0FBF4' },
  error:   { Icon: XCircle,      accent: '#EF4444', tintBg: 'rgba(239,68,68,0.15)',  softBg: '#FEF2F2' },
  warning: { Icon: AlertTriangle,accent: '#F59E0B', tintBg: 'rgba(251,191,36,0.15)', softBg: '#FFFBEB' },
  info:    { Icon: Info,         accent: '#5B4FCF', tintBg: 'rgba(91,79,207,0.15)',  softBg: '#F4F3FE' },
}

function ToastItem({ toast, onClose }) {
  const [visible, setVisible] = useState(false)
  const [closeColor, setCloseColor] = useState('rgba(15,31,61,0.4)')

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const { Icon, accent, tintBg, softBg } = typeConfig[toast.type] || typeConfig.info

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: softBg,
        minWidth: 300,
        maxWidth: 380,
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(15,31,61,0.18)',
        border: `1px solid ${tintBg}`,
        borderLeft: `5px solid ${accent}`,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.96)',
        transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: tintBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={accent} />
      </div>

      <span
        style={{
          flex: 1,
          color: '#0F1F3D',
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </span>

      <button
        onClick={onClose}
        onMouseEnter={() => setCloseColor('#0F1F3D')}
        onMouseLeave={() => setCloseColor('rgba(15,31,61,0.4)')}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={16} color={closeColor} />
      </button>
    </div>
  )
}

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {[...toasts].reverse().map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  )
}
