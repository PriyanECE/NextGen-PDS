import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, MessageSquare, LogOut, UserPlus, Clock } from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();



    const MenuCard = ({ id, title, icon: Icon, onClick, color }) => (
        <button
            id={id}
            onClick={onClick}
            className={`relative overflow-hidden group p-6 rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-100 flex flex-col items-center justify-center gap-4 text-center h-48 w-full`}
        >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 ${color}`} />
            <div className={`p-4 rounded-2xl ${color.replace('bg-', 'bg-').replace('500', '100')} ${color.replace('bg-', 'text-').replace('500', '600')} group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 group-hover:text-slate-900">{title}</h3>
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 max-w-6xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Welcome, User
                    </h1>
                    <p className="text-slate-500">Select an option to proceed</p>
                </div>
                <button
                    id="btn-logout"
                    onClick={() => { localStorage.clear(); navigate('/'); }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-xl shadow-sm border border-slate-100"
                >
                    <LogOut size={24} />
                </button>
            </header>

            {/* Grid Menu */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <MenuCard
                    id="btn-nav-scan"
                    title="Scan Ration Card"
                    icon={QrCode}
                    onClick={() => navigate('/scan')}
                    color="bg-indigo-500"
                />
                {/* Make Payment removed as per request (only available after scan) */}
                <MenuCard
                    id="btn-nav-history"
                    title="Shop History"
                    icon={Clock}
                    onClick={() => navigate('/history')}
                    color="bg-purple-500"
                />
                <MenuCard
                    id="btn-nav-add"
                    title="Add Beneficiary"
                    icon={UserPlus}
                    onClick={() => navigate('/add-beneficiary')}
                    color="bg-pink-500"
                />
            </div>

        </div>
    );
};

export default Home;
