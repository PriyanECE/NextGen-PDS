import React, { useState, useEffect } from 'react';
import { Package, ArrowLeft, Plus, RefreshCw, BarChart3, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import API_URL from '../../config/api';

const AdminInventory = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();


    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState({
        rice: { total: 0, dispensed: 0 },
        dhal: { total: 0, dispensed: 0 }
    });
    const [inputStock, setInputStock] = useState({ rice: '', dhal: '' });
    const [updating, setUpdating] = useState({ rice: false, dhal: false });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const res = await fetch(`${API_URL}/inventory`);
            const data = await res.json();
            setInventory(data);
        } catch (err) { console.error(err); } finally {
            setLoading(false);
        }
    };

    const handleAddStock = async (amount, item) => {
        const qtyToAdd = parseFloat(amount);
        if (isNaN(qtyToAdd) || qtyToAdd <= 0) return addToast("Invalid Amount", 'error');

        const itemKey = item.toLowerCase();
        setUpdating(p => ({ ...p, [itemKey]: true }));

        // Check Capacity
        const currentTotal = inventory[itemKey]?.total || 0;
        const maxCapacity = 1000.0;

        if (currentTotal + qtyToAdd > maxCapacity) {
            setUpdating(p => ({ ...p, [itemKey]: false }));
            return addToast(`Capacity Limit Exceeded! Max: ${maxCapacity}kg`, 'error');
        }

        try {
            await fetch(`${API_URL}/inventory/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: qtyToAdd, item })
            });
            await fetchInventory();
            addToast(`${qtyToAdd}kg ${item} Added`, 'success');
            setInputStock(prev => ({ ...prev, [itemKey]: '' }));
        } catch (err) {
            addToast("Failed to add stock", 'error');
        } finally {
            setUpdating(p => ({ ...p, [itemKey]: false }));
        }
    };

    const StockCard = ({ title, type, color, bg, icon: Icon, data, inputValue, onInputChange, onAdd, isUpdating }) => (
        <Card className={`overflow-hidden border-none shadow-xl ${bg} relative group`}>
            {/* Background Pattern */}
            <div className={`absolute top-0 right-0 p-8 opacity-10 transform group-hover:scale-110 transition-transform duration-500`}>
                <Icon size={180} />
            </div>

            <div className="relative z-10 p-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className={`text-sm font-bold opacity-60 uppercase tracking-widest ${color}`}>{title} Supply</p>
                        <h3 className={`text-5xl font-extrabold mt-2 ${color}`}>{(data?.total || 0).toFixed(1)} <span className="text-xl opacity-60">kg</span></h3>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center ${color} shadow-sm`}>
                        <Icon size={24} />
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl flex gap-2 shadow-sm border border-white/40">
                    <input
                        type="number"
                        className="flex-1 bg-transparent border-none outline-none px-4 font-mono font-bold text-slate-700 placeholder:text-slate-400"
                        placeholder="Add Qty..."
                        value={inputValue}
                        onChange={(e) => onInputChange(e.target.value)}
                    />
                    <Button
                        onClick={onAdd}
                        isLoading={isUpdating}
                        className={`rounded-xl shadow-none py-3 px-6 ${type === 'rice' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                    >
                        <Plus size={20} />
                    </Button>
                </div>

                <div className="mt-8 flex justify-between items-center opacity-70 border-t border-black/5 pt-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase">
                        <TrendingUp size={14} /> Total Dispensed
                    </div>
                    <p className="font-mono font-bold">{(data?.dispensed || 0).toFixed(1)} kg</p>
                </div>
            </div>
        </Card>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-10">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                        <ArrowLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Stock Inventory</h1>
                        <p className="text-slate-500">Real-time supply monitoring</p>
                    </div>
                    <div className="ml-auto flex gap-3">
                        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2 text-sm font-bold text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Updates
                        </div>
                        <Button onClick={fetchInventory} variant="outline" size="icon">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <StockCard
                        title="Rice"
                        type="rice"
                        color="text-indigo-900"
                        bg="bg-gradient-to-br from-indigo-50 to-indigo-100"
                        icon={Package}
                        data={inventory.rice}
                        inputValue={inputStock.rice}
                        onInputChange={(v) => setInputStock(p => ({ ...p, rice: v }))}
                        onAdd={() => handleAddStock(inputStock.rice, "Rice")}
                        isUpdating={updating.rice}
                    />
                    <StockCard
                        title="Dhall"
                        type="dhal"
                        color="text-orange-900"
                        bg="bg-gradient-to-br from-orange-50 to-orange-100"
                        icon={Package}
                        data={inventory.dhal}
                        inputValue={inputStock.dhal}
                        onInputChange={(v) => setInputStock(p => ({ ...p, dhal: v }))}
                        onAdd={() => handleAddStock(inputStock.dhal, "Dhal")}
                        isUpdating={updating.dhal}
                    />
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-6 mt-8">
                    <Card className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Stock Health</p>
                            <p className="text-xl font-bold text-slate-800">Optimal</p>
                        </div>
                    </Card>
                    <Card className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                            <RefreshCw size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Last Restock</p>
                            <p className="text-xl font-bold text-slate-800">Today</p>
                        </div>
                    </Card>
                    <Card className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Usage Rate</p>
                            <p className="text-xl font-bold text-slate-800">High</p>
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    );
};

export default AdminInventory;
