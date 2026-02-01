import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ShoppingBag, ClipboardList, Clock, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import API_URL from '../config/api';

const StatusBadge = ({ status }) => {
    const styles = {
        Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        Rejected: 'bg-red-100 text-red-800 border-red-200',
        ChangesRequested: 'bg-orange-100 text-orange-800 border-orange-200',
        Pending: 'bg-amber-100 text-amber-800 border-amber-200'
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || styles.Pending}`}>
            {status}
        </span>
    );
};

const ShopHistory = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'requests'

    const [historyData, setHistoryData] = useState([]);
    const [requestsHistory, setRequestsHistory] = useState([]);
    const [loading, setLoading] = useState(true);



    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) { navigate('/'); return; }
        setCurrentUser(user);

        // Parse Tab from URL
        const params = new URLSearchParams(location.search);
        if (params.get('tab') === 'requests') setActiveTab('requests');

        fetchData(user);
    }, []);

    const fetchData = async (user) => {
        setLoading(true);
        try {
            const [txnRes, reqRes] = await Promise.all([
                fetch(`${API_URL}/reports?shop=${encodeURIComponent(user.shopLocation || '')}&sort=date_desc`),
                fetch(`${API_URL}/beneficiary-requests?email=${encodeURIComponent(user.email || '')}`)
            ]);

            if (txnRes.ok) setHistoryData(await txnRes.json());
            if (reqRes.ok) setRequestsHistory(await reqRes.json());
        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === id
                ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
        >
            <Icon size={18} /> {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
                        <ArrowLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Activity History</h1>
                        <p className="text-slate-500 text-sm">{currentUser?.shopLocation || 'My Shop'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchData(currentUser)} className="ml-auto">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>

                <Card className="overflow-hidden min-h-[600px] flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100">
                        <TabButton id="transactions" label="Dispense Logs" icon={ShoppingBag} />
                        <TabButton id="requests" label="My Requests" icon={ClipboardList} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-slate-50/30">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <RefreshCw className="animate-spin mb-4" size={32} />
                                <p>Loading History...</p>
                            </div>
                        ) : activeTab === 'transactions' ? (
                            // Transactions Table
                            historyData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                    <ShoppingBag size={48} className="mb-4 opacity-20" />
                                    <p>No transactions recorded yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                            <tr>
                                                <th className="p-4 pl-6">Date</th>
                                                <th className="p-4">Beneficiary</th>
                                                <th className="p-4">Items</th>
                                                <th className="p-4 text-right pr-6">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {historyData.map((txn, i) => (
                                                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 pl-6">
                                                        <div className="font-bold text-slate-700">{new Date(txn.date).toLocaleDateString()}</div>
                                                        <div className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Clock size={10} /> {new Date(txn.date).toLocaleTimeString()}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-slate-800">{txn.beneficiaryName || 'Unknown'}</div>
                                                        <div className="text-xs text-slate-500 font-mono bg-slate-100 px-1 rounded w-fit mt-0.5">{txn.cardId}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {txn.items.map((item, idx) => (
                                                                <span key={idx} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-600">
                                                                    {item.item}: {item.qty}{item.unit}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right pr-6 font-bold text-slate-900">
                                                        ₹{txn.totalAmount}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : (
                            // Requests Table
                            requestsHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                    <ClipboardList size={48} className="mb-4 opacity-20" />
                                    <p>No requests submitted.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 bg-white">
                                    {requestsHistory.map((req, i) => (
                                        <div key={i} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
                                                    {req.data?.name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{req.data?.name}</h4>
                                                    <p className="text-xs text-slate-500 font-mono mb-2">Card: {req.data?.card}</p>
                                                    <div className="text-xs text-slate-400">
                                                        Submitted: {new Date(req.submissionDate).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:text-right flex flex-col items-start md:items-end gap-2">
                                                <StatusBadge status={req.status} />
                                                {req.adminComments && (
                                                    <p className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 max-w-[200px] truncate">
                                                        Note: {req.adminComments}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ShopHistory;
