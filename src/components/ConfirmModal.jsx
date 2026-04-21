import React from 'react';
import { X, AlertTriangle, Info, HelpCircle, Loader2 } from 'lucide-react';

/**
 * ConfirmModal
 * 
 * Props:
 *   isOpen      : boolean
 *   onClose     : () => void
 *   onConfirm   : () => void
 *   title       : string
 *   message     : string
 *   confirmText : string
 *   cancelText  : string
 *   type        : 'danger' | 'info' | 'warning' | 'success'
 *   isLoading   : boolean
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Está seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  isLoading = false
}) {
  if (!isOpen) return null;

  const themes = {
    danger: {
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      icon: AlertTriangle
    },
    warning: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
      icon: AlertTriangle
    },
    info: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      icon: Info
    },
    success: {
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      icon: HelpCircle
    }
  };

  const theme = themes[type] || themes.danger;
  const Icon = theme.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 ${theme.bg}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${theme.iconBg} ${theme.iconColor}`}>
              <Icon size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600 mt-1">{message}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-6 py-2 text-sm font-semibold text-white rounded-xl shadow-lg shadow-black/5 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${theme.button}`}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
