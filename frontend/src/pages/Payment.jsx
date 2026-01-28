import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Banknote, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Payment = () => {
    const navigate = useNavigate();
    const [method, setMethod] = useState(null); // 'upi' | 'cash'
    const [success, setSuccess] = useState(false);

    const AMOUNT = 15; // Mock amount

    const handlePayment = () => {
        // Simulate API call
        setTimeout(() => {
            setSuccess(true);
            setTimeout(() => navigate('/home'), 3000);
        }, 2000);
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white p-10 rounded-3xl shadow-xl text-center space-y-4 max-w-sm w-full"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Payment Successful!</h2>
                    <p className="text-slate-500">Transaction ID: TXN-{Math.floor(Math.random() * 1000000)}</p>
                    <p className="text-sm text-slate-400">Redirecting to home...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => navigate('/home')} className="flex items-center text-slate-500 hover:text-slate-900 mb-8 transition-colors">
                    <ArrowLeft size={20} className="mr-2" /> Back to Home
                </button>

                <h1 className="text-3xl font-bold text-slate-900 mb-2">Select Payment Method</h1>
                <p className="text-slate-500 mb-8">Total Amount to Pay: <span className="text-indigo-600 font-bold text-xl">₹{AMOUNT}</span></p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <button
                        onClick={() => setMethod('upi')}
                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${method === 'upi' ? 'border-indigo-500 bg-indigo-50 shadow-lg' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <QrCode size={32} className="text-indigo-600" />
                        </div>
                        <span className="font-semibold text-slate-800">UPI / QR Code</span>
                    </button>

                    <button
                        onClick={() => setMethod('cash')}
                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${method === 'cash' ? 'border-indigo-500 bg-indigo-50 shadow-lg' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Banknote size={32} className="text-green-600" />
                        </div>
                        <span className="font-semibold text-slate-800">Cash Payment</span>
                    </button>
                </div>

                {method === 'upi' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 flex flex-col items-center text-center space-y-4"
                    >
                        <div className="bg-white p-2 rounded-xl shadow-inner border border-slate-100 inline-block">
                            {/* Placeholder QR */}
                            <div className="w-48 h-48 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                                [UPI QR CODE]
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">Scan with any UPI App to pay ₹{AMOUNT}</p>
                        <button onClick={handlePayment} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 w-full md:w-auto">
                            I have paid
                        </button>
                    </motion.div>
                )}

                {method === 'cash' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 text-center space-y-4"
                    >
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                            <Banknote size={32} />
                        </div>
                        <h3 className="font-semibold text-lg">Cash Collection</h3>
                        <p className="text-slate-500">Please collect ₹{AMOUNT} from the user.</p>
                        <button onClick={handlePayment} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 w-full md:w-auto">
                            Confirm Cash Received
                        </button>
                    </motion.div>
                )}

            </div>
        </div>
    );
};

export default Payment;
