import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    // type: 'success', 'error', 'info'
    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 5 seconds
        setTimeout(() => removeToast(id), 5000);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto min-w-[300px] max-w-sm p-4 rounded-xl shadow-lg border flex items-start gap-3 transform transition-all animate-in slide-in-from-right duration-300
                        ${toast.type === 'success' ? 'bg-white border-green-200 text-green-800' :
                                toast.type === 'error' ? 'bg-white border-red-200 text-red-800' :
                                    'bg-white border-blue-200 text-slate-800'}`}
                    >
                        <div className={`mt-0.5 ${toast.type === 'success' ? 'text-green-500' :
                                toast.type === 'error' ? 'text-red-500' : 'text-blue-500'
                            }`}>
                            {toast.type === 'success' ? <CheckCircle size={18} /> :
                                toast.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
                        </div>
                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                        <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
