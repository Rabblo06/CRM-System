'use client';

import React, {
  createContext, useContext, useState, useCallback, useRef, useEffect,
} from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

/* ─────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────── */
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
}

interface ToastCtxValue {
  add: (type: ToastType, message: string, opts?: { title?: string; duration?: number }) => string;
  dismiss: (id: string) => void;
  update: (id: string, type: ToastType, message: string) => void;
}

/* ─────────────────────────────────────────────────────
   Context + hook
───────────────────────────────────────────────────── */
const ToastCtx = createContext<ToastCtxValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return {
    toast: {
      success: (msg: string, opts?: { title?: string; duration?: number }) =>
        ctx.add('success', msg, opts),
      error: (msg: string, opts?: { title?: string; duration?: number }) =>
        ctx.add('error', msg, opts),
      warning: (msg: string, opts?: { title?: string; duration?: number }) =>
        ctx.add('warning', msg, opts),
      info: (msg: string, opts?: { title?: string; duration?: number }) =>
        ctx.add('info', msg, opts),
      loading: (msg: string, opts?: { title?: string }) =>
        ctx.add('loading', msg, { ...opts, duration: 0 }),
      dismiss: ctx.dismiss,
      update: ctx.update,
    },
  };
}

/* ─────────────────────────────────────────────────────
   Provider
───────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const add = useCallback((
    type: ToastType,
    message: string,
    opts?: { title?: string; duration?: number },
  ): string => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duration = opts?.duration !== undefined ? opts.duration : 4500;
    // Keep max 5 toasts
    setToasts(p => [{ id, type, message, title: opts?.title, duration }, ...p.slice(0, 4)]);
    if (duration > 0) {
      const t = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, t);
    }
    return id;
  }, [dismiss]);

  const update = useCallback((id: string, type: ToastType, message: string) => {
    setToasts(p => p.map(t => t.id === id ? { ...t, type, message, duration: 4500 } : t));
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => dismiss(id), 4500);
    timers.current.set(id, t);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={{ add, dismiss, update }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

/* ─────────────────────────────────────────────────────
   Viewport
───────────────────────────────────────────────────── */
function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none"
      style={{ width: 'min(380px, calc(100vw - 2.5rem))' }}
    >
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Card
───────────────────────────────────────────────────── */
const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-[18px] h-[18px] text-white flex-shrink-0" />,
  error:   <XCircle      className="w-[18px] h-[18px] text-white flex-shrink-0" />,
  warning: <AlertTriangle className="w-[18px] h-[18px] text-white flex-shrink-0" />,
  info:    <Info         className="w-[18px] h-[18px] text-white flex-shrink-0" />,
  loading: <Loader2      className="w-[18px] h-[18px] text-white flex-shrink-0 animate-spin" />,
};

const BAR_COLOR: Record<ToastType, string> = {
  success: '#4CAF8E',
  error:   '#D45353',
  warning: '#E8882A',
  info:    '#4762D5',
  loading: '#666666',
};

function ToastCard({ toast: t, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      role="alert"
      className="pointer-events-auto flex items-stretch rounded-[4px] shadow-lg overflow-hidden bg-white border border-[#EBEBEB]"
      style={{
        transform: show ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
        opacity: show ? 1 : 0,
        transition: 'transform 0.22s ease, opacity 0.22s ease',
      }}
    >
      {/* Colour bar + icon */}
      <div
        className="flex-shrink-0 w-10 flex items-center justify-center"
        style={{ backgroundColor: BAR_COLOR[t.type] }}
      >
        {ICONS[t.type]}
      </div>

      {/* Text */}
      <div className="flex-1 px-3 py-2.5 min-w-0">
        {t.title && (
          <p className="text-xs font-bold text-[#333333] leading-snug mb-0.5">{t.title}</p>
        )}
        <p className="text-xs text-[#555555] leading-snug break-words">{t.message}</p>
      </div>

      {/* Close */}
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="flex-shrink-0 self-start mt-2.5 mr-2 text-[#999999] hover:text-[#333333] transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
