import React, { useState, useEffect } from 'react';
import { BarChart3, ArrowLeft, Download, Filter, RefreshCw, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import API_URL from '../../config/api';

const AdminReports = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();


    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [shops, setShops] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        shop: '',
        sort: 'date_desc',
        search: ''
    });

    useEffect(() => {
        fetchShops();
        fetchReports();
    }, []);

    const fetchShops = async () => {
        try {
            const res = await fetch(`${API_URL}/shops`);
            setShops(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            let query = `?sort=${filters.sort}`;
            if (filters.shop) query += `&shop=${encodeURIComponent(filters.shop)}`;

            const res = await fetch(`${API_URL}/reports${query}`);
            const data = await res.json();
            setReports(data);
        } catch (err) {
            addToast("Failed to fetch reports", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Client-side search filtering
    const filteredReports = reports.filter(r =>
        r.cardId?.includes(filters.search) ||
        r.beneficiaryId?.includes(filters.search) ||
        r.location?.toLowerCase().includes(filters.search.toLowerCase())
    );

    const TableHeader = ({ children }) => (
        <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">
            {children}
        </th>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                            <ArrowLeft size={24} />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Transaction Logs</h1>
                            <p className="text-slate-500 text-sm">Audit trail of all ration disbursements</p>
                        </div>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => addToast("Export feature coming soon", 'info')}>
                        <Download size={16} /> Export CSV
                    </Button>
                </div>

                {/* Controls */}
                <Card className="p-4 mb-6 flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 w-full">
                        <Input
                            icon={Search}
                            placeholder="Search Card ID or Location..."
                            value={filters.search}
                            onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
                            className="bg-slate-50 border-transparent focus:bg-white"
                        />
                    </div>

                    <div className="flex gap-4 w-full lg:w-auto">
                        <div className="relative min-w-[200px] flex-1">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none cursor-pointer"
                                value={filters.shop}
                                onChange={(e) => {
                                    setFilters(p => ({ ...p, shop: e.target.value }));
                                    fetchReports(); // Trigger refetch or useEffect dep
                                }}
                            >
                                <option value="">All Locations</option>
                                {shops.map(s => <option key={s._id} value={s.tehsil}>{s.tehsil}</option>)}
                            </select>
                        </div>

                        <div className="relative min-w-[180px] flex-1">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none cursor-pointer"
                                value={filters.sort}
                                onChange={(e) => {
                                    setFilters(p => ({ ...p, sort: e.target.value }));
                                    // Trigger fetch via useEffect dep manually or just call fetch
                                    setTimeout(fetchReports, 0);
                                }}
                            >
                                <option value="date_desc">Newest First</option>
                                <option value="date_asc">Oldest First</option>
                                <option value="amount_desc">Highest Value</option>
                            </select>
                        </div>

                        <Button onClick={fetchReports} className="px-6 bg-brand-600 text-white">
                            <Filter size={18} />
                        </Button>
                    </div>
                </Card>

                {/* Table */}
                <Card className="overflow-hidden border border-slate-200 shadow-sm min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <TableHeader>Date & Time</TableHeader>
                                    <TableHeader>Beneficiary Details</TableHeader>
                                    <TableHeader>Items Dispensed</TableHeader>
                                    <TableHeader>Total Value</TableHeader>
                                    <TableHeader>Location</TableHeader>
                                    <TableHeader>Payment</TableHeader>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400">Loading records...</td></tr>
                                ) : filteredReports.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400">No transactions found.</td></tr>
                                ) : (
                                    filteredReports.map(txn => (
                                        <tr key={txn._id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{new Date(txn.date).toLocaleDateString()}</span>
                                                    <span className="text-xs text-slate-400 font-mono">{new Date(txn.date).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-brand-600 font-mono">{txn.cardId}</span>
                                                    <span className="text-xs text-slate-400">ID: {txn.beneficiaryId?.substring(0, 8)}...</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex gap-2">
                                                    {txn.items.map((item, idx) => (
                                                        <span key={idx} className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 border border-slate-200">
                                                            {item.item}: {item.qty}{item.unit}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="font-bold text-slate-900">₹{txn.totalAmount}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                                    <MapPin size={12} className="text-slate-400" /> {txn.location}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${txn.paymentMode === 'Cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    <CreditCard size={10} /> {txn.paymentMode}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AdminReports;
