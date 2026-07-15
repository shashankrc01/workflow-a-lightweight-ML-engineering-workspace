import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon } from "../components/Icon.jsx";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const show = useCallback((message, type = "info", duration = 4500) => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg) => show(msg, "success"),
    error: (msg) => show(msg, "error"),
    info: (msg) => show(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const styles = {
    success: "border-success/30 bg-success-soft text-success",
    error: "border-danger/30 bg-danger-soft text-danger",
    info: "border-border bg-white text-ink",
  }[toast.type];

  const IconEl = { success: Icon.Check, error: Icon.AlertTriangle, info: Icon.Info }[toast.type];

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 shadow-modal text-sm animate-[fadein_.15s_ease-out] ${styles}`}>
      <IconEl size={16} className="mt-0.5 shrink-0" />
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100">
        <Icon.X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
