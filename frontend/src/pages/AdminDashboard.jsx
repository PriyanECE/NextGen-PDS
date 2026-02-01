import React from 'react';
import { Users, Package, TrendingUp, Shield, Plus, LogOut, MapPin, ChevronRight, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Menu Configuration
    const menuItems = [
        {
            title: "Shop Network",
            desc: "Manage 3,000+ shops & employees",
            icon: MapPin,
            color: "text-indigo-600 bg-indigo-50",
            path: "/admin/network"
        },
        {
            title: "Inventory Stock",
            desc: "Monitor rice, dhal & supplies",
            icon: Package,
            color: "text-orange-600 bg-orange-50",
            path: "/admin/inventory"
        },
        {
            title: "Reports & Logs",
            desc: "Transaction history & analytics",
            icon: TrendingUp,
            color: "text-blue-600 bg-blue-50",
            path: "/admin/reports"
        },
        {
            title: "Pending Requests",
            desc: "Approve new beneficiary cards",
            icon: Shield,
            color: "text-emerald-600 bg-emerald-50",
            path: "/admin/requests"
        }
    ];

    const handleLogout = () => {
        localStorage.removeItem('user');
        addToast("Logged Out Successfully", 'info');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-brand-100 text-brand-700 p-1.5 rounded-lg">
                                <LayoutGrid size={20} />
                            </div>
                            <span className="text-brand-600 font-bold uppercase tracking-widest text-xs">Admin Hub</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">System Command</h1>
                        <p className="text-slate-500 text-lg mt-1">Manage network, inventory, and beneficiaries.</p>
                    </div>
                    <Button
                        variant="danger"
                        onClick={handleLogout}
                        className="flex items-center gap-2"
                    >
                        <LogOut size={18} /> Logout
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuItems.map((item, idx) => (
                        <Card
                            key={idx}
                            hover={true}
                            onClick={() => navigate(item.path)}
                            className="p-8 cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${item.color}`}>
                                    <item.icon size={32} />
                                </div>
                                <div className="p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                    <ChevronRight size={20} />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-brand-700 transition-colors">{item.title}</h2>
                            <p className="text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                        </Card>
                    ))}

                    {/* Quick Action: Add Employee */}
                    <div
                        onClick={() => navigate('/admin/setup/employee/new')}
                        className="col-span-1 md:col-span-2 lg:col-span-1 bg-gradient-to-br from-brand-600 to-brand-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer text-white flex flex-col justify-center items-center text-center relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-10 transition-opacity" />
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6 backdrop-blur-sm shadow-inner border border-white/10">
                            <Plus size={32} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Register Employee</h2>
                        <p className="text-brand-100 font-medium">Quickly onboard new staff members to the network</p>
                    </div>
                </div>

                <div className="mt-16 border-t border-slate-200 pt-8 flex justify-between items-center text-slate-400 text-sm">
                    <p>© 2026 Smart PDS Admin Console</p>
                    <p>System Status: <span className="text-emerald-500 font-bold">● Operational</span></p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
