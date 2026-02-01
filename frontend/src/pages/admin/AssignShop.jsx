import React, { useState, useEffect } from 'react';
import { ArrowLeft, Store, Users, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import API_URL from '../../config/api';

const AssignShop = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addToast } = useToast();


    const targetShopTehsil = searchParams.get('shop');

    // State
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_URL}/employees`);
            setEmployees(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleAssign = async () => {
        if (!selectedEmp) return addToast("Please select an employee", 'error');
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/employees/${selectedEmp}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopLocation: targetShopTehsil })
            });

            if (res.ok) {
                addToast("Assignment Successful", 'success');
                navigate('/admin/network');
            } else {
                addToast("Assignment Failed", 'error');
            }
        } catch (err) {
            addToast("Network Error", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter employees who are NOT already in this shop
    const availableEmployees = employees.filter(e => e.shopLocation !== targetShopTehsil);

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center font-sans">
            <div className="w-full max-w-lg">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-2 text-slate-500 hover:text-slate-800">
                    <ArrowLeft size={20} className="mr-2" /> Back to Network
                </Button>

                <Card className="p-8 border-t-4 border-indigo-500">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Store size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Assign Staff Member</h1>
                        <p className="text-slate-500 mt-2">
                            Adding employee to <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{targetShopTehsil}</span>
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="relative group">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Select Employee</label>
                            <div className="relative">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                <select
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-700 appearance-none cursor-pointer transition-all"
                                    value={selectedEmp}
                                    onChange={(e) => setSelectedEmp(e.target.value)}
                                >
                                    <option value="">-- Choose from List --</option>
                                    {availableEmployees.map(emp => (
                                        <option key={emp._id} value={emp._id}>
                                            {emp.name} — {emp.shopLocation || 'Unassigned'}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 ml-1">
                                {availableEmployees.length} active employees available for reassignment.
                            </p>
                        </div>

                        <Button
                            onClick={handleAssign}
                            isLoading={isSubmitting}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 py-4 text-lg"
                        >
                            <CheckCircle size={20} className="mr-2" /> Confirm Assignment
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AssignShop;
