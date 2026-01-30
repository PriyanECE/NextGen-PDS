import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <FileText size={64} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">{message}</p>
    </div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        Approved: 'bg-green-100 text-green-800',
        Rejected: 'bg-red-100 text-red-800',
        ChangesRequested: 'bg-orange-100 text-orange-800',
        Pending: 'bg-yellow-100 text-yellow-800'
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.Pending}`}>
            {status}
        </span>
    );
};

const ShopHistory = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'requests'

    // Data States
    const [historyData, setHistoryData] = useState([]);
    const [requestsHistory, setRequestsHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:5000/api';

    const location = useLocation();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            navigate('/');
            return;
        }
        setCurrentUser(user);
        fetchData(user);

        // Check URL Params for Tab Switching
        const params = new URLSearchParams(location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'requests') setActiveTab('requests');
        else if (tabParam === 'transactions') setActiveTab('transactions');
    }, [location.search]);

    const fetchData = async (user) => {
        setLoading(true);
        try {
            // Parallel Fetch
            const [txnRes, reqRes] = await Promise.all([
                fetch(`${API_URL}/reports?shop=${encodeURIComponent(user.shopLocation || '')}&sort=date_desc`),
                fetch(`${API_URL}/beneficiary-requests?email=${encodeURIComponent(user.email || '')}`)
            ]);

            if (txnRes.ok) setHistoryData(await txnRes.json());
            if (reqRes.ok) setRequestsHistory(await reqRes.json());

        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        id="btn-back-home"
                        onClick={() => navigate('/home')} // Or Navigate back (-1)
                        className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
                    >
                        <ArrowLeft size={24} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Shop History & Requests</h1>
                        <p className="text-slate-500">{currentUser?.shopLocation || 'Loading...'}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div className="flex border-b border-slate-100">
                        <button
                            id="btn-tab-dispense-logs"
                            onClick={() => setActiveTab('transactions')}
                            className={`flex-1 py-4 font-bold text-sm transition-all ${activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Dispense Logs
                        </button>
                        <button
                            id="btn-tab-my-requests"
                            onClick={() => setActiveTab('requests')}
                            className={`flex-1 py-4 font-bold text-sm transition-all ${activeTab === 'requests' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            My Requests
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 min-h-[500px]">
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <RefreshCw className="animate-spin text-indigo-600" size={40} />
                            </div>
                        ) : activeTab === 'transactions' ? (
                            // TRANSACTIONS TABLE
                            historyData.length === 0 ? (
                                <EmptyState message="No dispense transactions found." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 rounded-lg">
                                            <tr>
                                                <th className="p-4 font-medium rounded-l-lg">Time</th>
                                                <th className="p-4 font-medium">Beneficiary</th>
                                                <th className="p-4 font-medium">Items</th>
                                                <th className="p-4 font-medium">Amount</th>
                                                <th className="p-4 font-medium rounded-r-lg">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historyData.map((txn, i) => (
                                                <tr key={txn._id || i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 text-slate-600">
                                                        <div className="font-medium text-slate-800">{new Date(txn.date).toLocaleDateString()}</div>
                                                        <div className="text-xs text-slate-400">{new Date(txn.date).toLocaleTimeString()}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="font-bold text-slate-800">{txn.beneficiaryName}</p>
                                                        <p className="text-xs text-slate-500 font-mono">{txn.cardId}</p>
                                                    </td>
                                                    <td className="p-4 text-slate-600">
                                                        {txn.items.map((item, idx) => (
                                                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-1">
                                                                {item.item} ({item.qty}{item.unit})
                                                            </span>
                                                        ))}
                                                    </td>
                                                    <td className="p-4 font-bold text-slate-700">
                                                        ₹{txn.totalAmount || 0}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            {txn.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : (
                            // REQUESTS TABLE
                            requestsHistory.length === 0 ? (
                                <EmptyState message="No beneficiary requests found." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500">
                                            <tr>
                                                <th className="p-4 font-medium rounded-l-lg">Submitted On</th>
                                                <th className="p-4 font-medium">Beneficiary Details</th>
                                                <th className="p-4 font-medium">Status</th>
                                                <th className="p-4 font-medium rounded-r-lg">Admin Comments</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {requestsHistory.map((req, i) => (
                                                <tr key={req._id || i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 text-slate-600">
                                                        {new Date(req.submissionDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="font-bold text-slate-800">{req.data?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-slate-500 font-mono">Card: {req.data?.card}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <StatusBadge status={req.status} />
                                                    </td>
                                                    <td className="p-4 text-slate-600 text-sm max-w-xs">
                                                        {req.adminComments ? (
                                                            <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                                <span className="text-slate-800">{req.adminComments}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic">No comments</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShopHistory;
