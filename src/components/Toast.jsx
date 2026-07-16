import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    bar: 'bg-green-500',
    iconColor: 'text-green-500 dark:text-green-400',
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-green-200 dark:border-green-700',
    title: 'text-green-800 dark:text-green-200',
    text: 'text-gray-600 dark:text-gray-300',
    close: 'text-green-400 hover:text-green-600 dark:hover:text-green-300',
    duration: 3000,
  },
  error: {
    icon: XCircle,
    bar: 'bg-red-500',
    iconColor: 'text-red-500 dark:text-red-400',
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-red-200 dark:border-red-700',
    title: 'text-red-800 dark:text-red-200',
    text: 'text-gray-600 dark:text-gray-300',
    close: 'text-red-400 hover:text-red-600 dark:hover:text-red-300',
    duration: 7000,
  },
  warning: {
    icon: AlertTriangle,
    bar: 'bg-amber-400',
    iconColor: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-amber-200 dark:border-amber-700',
    title: 'text-amber-800 dark:text-amber-200',
    text: 'text-gray-600 dark:text-gray-300',
    close: 'text-amber-400 hover:text-amber-600 dark:hover:text-amber-300',
    duration: 5000,
  },
  info: {
    icon: Info,
    bar: 'bg-blue-500',
    iconColor: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-blue-200 dark:border-blue-700',
    title: 'text-blue-800 dark:text-blue-200',
    text: 'text-gray-600 dark:text-gray-300',
    close: 'text-blue-400 hover:text-blue-600 dark:hover:text-blue-300',
    duration: 4000,
  },
};

function ToastItem({ entry, onDismiss }) {
  const conf = TOAST_CONFIG[entry.type] ?? TOAST_CONFIG.info;
  const Icon = conf.icon;
  const durationS = `${conf.duration / 1000}s`;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={[
        'relative flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border w-full max-w-sm overflow-hidden',
        conf.bg,
        conf.border,
        entry.exiting ? 'toast-exit' : 'toast-enter',
      ].join(' ')}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-[3px] ${conf.bar} toast-progress`}
        style={{ '--toast-duration': durationS }}
      />

      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 ${conf.iconColor}`}>
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {entry.title && (
          <p className={`text-xs font-bold mb-0.5 ${conf.title}`}>{entry.title}</p>
        )}
        <p className={`text-sm leading-snug ${conf.text}`}>{entry.message}</p>
      </div>

      {/* Close */}
      <button
        onClick={onDismiss}
        className={`flex-shrink-0 transition-colors mt-0.5 ${conf.close}`}
        aria-label="Cerrar notificación"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function Toast() {
  const { toastQueue } = useApp();

  if (!toastQueue.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col-reverse gap-2 items-end pointer-events-none">
      {toastQueue.map(entry => (
        <div key={entry.id} className="pointer-events-auto w-full max-w-sm">
          <ToastItem entry={entry} onDismiss={entry.onDismiss} />
        </div>
      ))}
    </div>
  );
}

