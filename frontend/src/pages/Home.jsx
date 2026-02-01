import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Clock, UserPlus, LogOut, ChevronRight, Activity } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Home = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const ActionCard = ({ title, desc, icon: Icon, onClick, color }) => (
        <Card
            hover={true}
            onClick={onClick}
            className="p-6 cursor-pointer group relative overflow-hidden border-2 border-transparent hover:border-brand-500/10"
        >
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 opacity-10 bg-gradient-to-br ${color} blur-2xl transition-all group-hover:scale-150`} />

            <div className="relative z-10 flex flex-col h-full">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm bg-gradient-to-br ${color} text-white`}>
                    <Icon size={28} />
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-brand-700 transition-colors">{title}</h3>
                <p className="text-slate-500 text-sm font-medium mb-6 flex-grow">{desc}</p>

                <div className="flex items-center text-brand-600 font-bold text-sm bg-brand-50 w-fit px-3 py-1.5 rounded-lg group-hover:bg-brand-600 group-hover:text-white transition-all">
                    Open Action <ChevronRight size={16} className="ml-1" />
                </div>
            </div>
        </Card>
    );

    return (
        <div className="min-h-screen bg-slate-50 relative">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-96 bg-brand-900 rounded-b-[3rem] shadow-2xl z-0" />

            <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12">

                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-white/20 backdrop-blur-md p-1 rounded-lg">
                                <Activity className="text-cyan-400" size={20} />
                            </div>
                            <span className="text-cyan-400 font-bold tracking-widest text-xs uppercase">Employee Dashboard</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white mb-2">Hello, {user.name || 'Staff'}</h1>
                        <p className="text-indigo-200">Ready to serve beneficiaries today?</p>
                    </div>

                    <Button
                        variant="glass"
                        onClick={() => { localStorage.clear(); navigate('/'); }}
                        className="flex items-center gap-2"
                    >
                        <LogOut size={18} /> Sign Out
                    </Button>
                </div>

                {/* Quick Stats (Mock) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white">
                        <p className="text-indigo-200 text-sm font-medium mb-1">Today's Ratio</p>
                        <p className="text-3xl font-bold">85%</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white">
                        <p className="text-indigo-200 text-sm font-medium mb-1">Pending Orders</p>
                        <p className="text-3xl font-bold">12</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white">
                        <p className="text-indigo-200 text-sm font-medium mb-1">System Status</p>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                            <p className="text-xl font-bold">Online</p>
                        </div>
                    </div>
                </div>

                {/* Main Action Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <ActionCard
                        title="Distribute Ration"
                        desc="Scan cards and dispense supplies to beneficiaries."
                        icon={QrCode}
                        color="from-indigo-500 to-blue-600"
                        onClick={() => navigate('/scan')}
                    />
                    <ActionCard
                        title="Transaction History"
                        desc="View past transactions and daily logs."
                        icon={Clock}
                        color="from-purple-500 to-fuchsia-600"
                        onClick={() => navigate('/history')}
                    />
                    <ActionCard
                        title="Register Member"
                        desc="Add new beneficiaries to the database."
                        icon={UserPlus}
                        color="from-pink-500 to-rose-600"
                        onClick={() => navigate('/add-beneficiary')}
                    />
                </div>

                <div className="mt-12 text-center">
                    <p className="text-slate-400 text-sm">Need Help? Try saying <span className="text-brand-600 font-bold">"Hey Smart PDS, open history"</span></p>
                </div>
            </div>
        </div>
    );
};

export default Home;
