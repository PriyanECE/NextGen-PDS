import React, { createContext, useContext, useState, useRef } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

const ConfirmContext = createContext();

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        message: '',
        title: 'Confirm Action',
        type: 'warning', // warning, info, danger
        resolve: null
    });

    const confirm = (message, options = {}) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                message,
                title: options.title || 'Confirm Action',
                type: options.type || 'warning',
                resolve
            });
        });
    };

    const handleConfirm = () => {
        if (confirmState.resolve) confirmState.resolve(true);
        setConfirmState({ ...confirmState, isOpen: false });
    };

    const handleCancel = () => {
        if (confirmState.resolve) confirmState.resolve(false);
        setConfirmState({ ...confirmState, isOpen: false });
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {confirmState.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className={`p-4 rounded-full ${confirmState.type === 'danger' ? 'bg-red-100 text-red-600' :
                                    confirmState.type === 'success' ? 'bg-green-100 text-green-600' :
                                        'bg-orange-100 text-orange-600'
                                }`}>
                                {confirmState.type === 'danger' ? <AlertCircle size={32} /> :
                                    confirmState.type === 'success' ? <CheckCircle size={32} /> :
                                        <AlertCircle size={32} />}
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{confirmState.title}</h3>
                                <p className="text-slate-500 mt-2">{confirmState.message}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full mt-2">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${confirmState.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' :
                                            confirmState.type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/30' :
                                                'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'
                                        }`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};
