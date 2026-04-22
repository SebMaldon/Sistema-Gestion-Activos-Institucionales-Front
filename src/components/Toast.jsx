import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const TOAST_CONFIG = {
  success: { icon: CheckCircle, bg: '#dcfce7', border: '#86efac', text: '#166534', iconColor: '#16a34a' },
  error: { icon: XCircle, bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', iconColor: '#dc2626' },
  warning: { icon: AlertTriangle, bg: '#fef9c3', border: '#fde047', text: '#854d0e', iconColor: '#ca8a04' },
  info: { icon: Info, bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', iconColor: '#2563eb' },
};

export default function Toast() {
  const { toast, showToast } = useApp();

  if (!toast) return null;

  const conf = TOAST_CONFIG[toast.type] || TOAST_CONFIG.success;
  const Icon = conf.icon;
  return (
    <div
      className="fixed bottom-6 right-6 z-[99999] flex items-start gap-3 px-5 py-4 rounded-xl shadow-2xl border max-w-sm toast-enter"
      style={{ backgroundColor: conf.bg, borderColor: conf.border, color: conf.text }}
    >
      <Icon size={20} style={{ color: conf.iconColor }} className="flex-shrink-0 mt-0.5" />
      <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => showToast(null)}
        className="ml-2 hover:opacity-70 transition-opacity"
        style={{ color: conf.iconColor }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
