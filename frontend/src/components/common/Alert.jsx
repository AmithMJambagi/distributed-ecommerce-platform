import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function Alert({ type = 'info', message, onClose, className = '' }) {
  if (!message) return null;

  const styles = {
    success: {
      border: 'border-black bg-neutral-50 text-neutral-900',
      icon: <CheckCircle className="w-4 h-4 text-black shrink-0" />
    },
    error: {
      border: 'border-red-600 bg-red-50/50 text-red-900',
      icon: <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
    },
    warning: {
      border: 'border-neutral-800 bg-neutral-100 text-neutral-900',
      icon: <Info className="w-4 h-4 text-neutral-800 shrink-0" />
    },
    info: {
      border: 'border-neutral-300 bg-neutral-50 text-neutral-900',
      icon: <Info className="w-4 h-4 text-neutral-700 shrink-0" />
    }
  };

  const current = styles[type] || styles.info;

  return (
    <div
      className={`flex items-start gap-3 p-3.5 border ${current.border} text-xs font-medium ${className}`}
    >
      {current.icon}
      <div className="flex-1 leading-relaxed">{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="text-neutral-400 hover:text-black transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
