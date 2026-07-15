import { useEffect } from "react";
import { Icon } from "./Icon.jsx";

export function Modal({ title, onClose, children, footer, width = "max-w-md" }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full ${width} rounded-xl bg-surface shadow-modal border border-border`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-black/5 hover:text-ink" aria-label="Close">
            <Icon.X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel, busy }) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button
          className={danger ? "btn-danger" : "btn-primary"}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </>
    }>
      <p className="text-sm text-ink-muted">{message}</p>
    </Modal>
  );
}
