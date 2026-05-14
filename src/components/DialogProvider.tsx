'use client';

import React, { createContext, useContext, useCallback, useState, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogContextType {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (val: boolean) => void }) | null>(null);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  const toastIcons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const toastColors: Record<ToastType, string> = {
    success: 'border-l-[#00e5a0] bg-[#00e5a0]/10',
    error: 'border-l-[#ff4d6a] bg-[#ff4d6a]/10',
    warning: 'border-l-[#f59e0b] bg-[#f59e0b]/10',
    info: 'border-l-[#00f0ff] bg-[#00f0ff]/10',
  };

  const toastIconColors: Record<ToastType, string> = {
    success: 'text-[#00e5a0]',
    error: 'text-[#ff4d6a]',
    warning: 'text-[#f59e0b]',
    info: 'text-[#00f0ff]',
  };

  return (
    <DialogContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ── Toast Stack ─────────────────────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--border)] border-l-4 backdrop-blur-sm shadow-lg ${toastColors[t.type]} animate-slide-in`}
          >
            <span className={`text-lg font-bold flex-shrink-0 ${toastIconColors[t.type]}`}>{toastIcons[t.type]}</span>
            <p className="text-sm text-[var(--text)] font-medium leading-relaxed">{t.message}</p>
          </div>
        ))}
      </div>

      {/* ── Confirm Modal ───────────────────────────────────────────────── */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleConfirm(false); }}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl w-full animate-scale-in"
            style={{ maxWidth: 420 }}
          >
            {/* Icon */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl mx-auto mb-5 ${confirmState.danger ? 'bg-[#ff4d6a]/15' : 'bg-[var(--accent)]/10'}`}>
              {confirmState.danger ? '⚠️' : '❓'}
            </div>

            {/* Title */}
            {confirmState.title && (
              <h3 className="text-xl font-bold text-center mb-2 font-[family-name:var(--font-bebas)] tracking-widest">
                {confirmState.title}
              </h3>
            )}

            {/* Message */}
            <p className="text-[var(--text2)] text-center text-sm mb-8 leading-relaxed">
              {confirmState.message}
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--text2)] font-bold text-sm uppercase tracking-widest hover:bg-[var(--bg3)] transition-all"
              >
                {confirmState.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
                  confirmState.danger
                    ? 'bg-[#ff4d6a] hover:bg-[#e03555] text-white'
                    : 'bg-[var(--accent)] hover:brightness-110 text-black'
                }`}
              >
                {confirmState.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-in { animation: slide-in 0.25s ease forwards; }
        .animate-scale-in { animation: scale-in 0.2s ease forwards; }
      `}</style>
    </DialogContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
}
