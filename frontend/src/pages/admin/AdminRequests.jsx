import React, { useState, useEffect } from 'react';
import { ClipboardList, ArrowLeft, CheckCircle, XCircle, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import API_URL from '../../config/api';

const AdminRequests = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { confirm } = useConfirm();


    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/beneficiary-requests?status=Pending`);
            setRequests(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        const isApprove = action === 'Approved';
        if (!isApprove && !(await confirm("Reject this request?"))) return;

        try {
            const res = await fetch(`${API_URL}/beneficiary-requests/${id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action })
            });
            if (res.ok) {
                addToast(`Request ${action}`, isApprove ? 'success' : 'info');
                fetchRequests();
            } else {
                addToast("Action Failed", 'error');
            }
        } catch (err) {
            console.error(err);
            addToast("Network Error", 'error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                        <ArrowLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
                        <p className="text-slate-500 text-sm">Review incoming beneficiary applications</p>
                    </div>
                    <div className="ml-auto">
                        <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm flex items-center gap-2">
                            <Clock size={16} /> {requests.length} Pending
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center p-12 text-slate-400">Loading requests...</div>
                    ) : requests.length === 0 ? (
                        <Card className="text-center p-16 flex flex-col items-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                                <Shield size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">All Caught Up!</h3>
                            <p className="text-slate-500">No pending requests to review.</p>
                        </Card>
                    ) : (
                        requests.map(req => (
                            <Card key={req._id} className="p-6 flex flex-col md:flex-row justify-between gap-6 group hover:border-indigo-100 transition-colors">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-lg">
                                        {req.name[0]}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-bold text-slate-900">{req.name}</h3>
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] uppercase font-bold rounded-md tracking-wide">
                                                Review Needed
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <Shield size={14} className="text-slate-400" />
                                                <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded">{req.tempData.card}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Users size={14} className="text-slate-400" />
                                                <span>{req.tempData.members?.length || 0} Members</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-slate-400" />
                                                <span className="truncate max-w-[200px]">{req.tempData.address}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-3 self-end md:self-center w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-slate-100">
                                    <Button
                                        variant="outline"
                                        className="w-full sm:w-auto text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                                        onClick={() => handleAction(req._id, 'Rejected')}
                                    >
                                        <XCircle size={18} className="mr-2" /> Reject
                                    </Button>
                                    <Button
                                        className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-200"
                                        onClick={() => handleAction(req._id, 'Approved')}
                                    >
                                        <CheckCircle size={18} className="mr-2" /> Approve
                                    </Button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminRequests;
