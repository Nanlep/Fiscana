import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'SUCCESS' | 'ERROR' | 'INFO';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const styles = {
    SUCCESS: 'bg-white border-green-500 text-slate-800',
    ERROR: 'bg-white border-red-500 text-slate-800',
    INFO: 'bg-slate-900 border-slate-900 text-white'
  };

  const icons = {
    SUCCESS: <CheckCircle size={20} className="text-green-500" />,
    ERROR: <AlertCircle size={20} className="text-red-500" />,
    INFO: <Info size={20} className="text-blue-400" />
  };

  return (
    <div className={`pointer-events-auto flex items-center space-x-3 px-4 py-3 rounded-xl shadow-lg border-l-4 min-w-[300px] animate-in slide-in-from-right fade-in duration-300 ${styles[toast.type]}`}>
      <div>{icons[toast.type]}</div>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button onClick={onRemove} className="opacity-50 hover:opacity-100 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
