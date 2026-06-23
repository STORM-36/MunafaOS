import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import ToastContainer from './ToastContainer'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type, message) => {
    const id = crypto.randomUUID()
    const duration = type === 'error' ? 5000 : 3000

    setToasts((prev) => {
      const next = prev.length >= 3 ? prev.slice(1) : prev
      return [...next, { id, type, message }]
    })

    setTimeout(() => removeToast(id), duration)
  }, [removeToast])

  const toast = useMemo(() => ({
    success: (msg) => addToast('success', msg),
    error:   (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
    info:    (msg) => addToast('info', msg),
  }), [addToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx.toast
}
