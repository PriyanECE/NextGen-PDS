import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Filter, MoreHorizontal, Trash2, Edit, MapPin } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import API_URL from '../../config/api';

const AdminNetwork = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();


    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [shops, setShops] = useState([]);
    const [search, setSearch] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('All');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [empRes, shopRes] = await Promise.all([
                fetch(`${API_URL}/employees`),
                fetch(`${API_URL}/shops`)
            ]);
            setEmployees(await empRes.json());
            setShops(await shopRes.json());
        } catch (err) {
            addToast("Failed to load network data", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this employee?")) return;
        try {
            await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' });
            addToast("Employee Removed", 'success');
            fetchData();
        } catch (err) {
            addToast("Delete Failed", 'error');
        }
    };

    // Filter Logic
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) ||
            emp.email.toLowerCase().includes(search.toLowerCase());
        const matchesDistrict = filterDistrict === 'All' ||
            (shops.find(s => s.tehsil === emp.shopLocation)?.district === filterDistrict);
        return matchesSearch && matchesDistrict;
    });

    const districts = ['All', ...new Set(shops.map(s => s.district).filter(Boolean))];

    const TableHeader = ({ children }) => (
        <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100 sticky top-0">
            {children}
        </th>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" icon size="icon" onClick={() => navigate('/admin')}>
                            <ArrowLeft size={24} />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Network Management</h1>
                            <p className="text-slate-500 text-sm">Oversee shop assignments and staff</p>
                        </div>
                    </div>
                    <Button onClick={() => navigate('/admin/setup/employee/new')} className="gap-2">
                        <Plus size={18} /> Add New Employee
                    </Button>
                </div>

                {/* Filters */}
                <Card className="p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                        <Input
                            icon={Search}
                            placeholder="Search by Name or Email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-slate-50 border-transparent focus:bg-white"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                className="pl-10 pr-8 py-3.5 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none cursor-pointer"
                                value={filterDistrict}
                                onChange={(e) => setFilterDistrict(e.target.value)}
                            >
                                {districts.map(d => <option key={d} value={d}>{d} Region</option>)}
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Data Table */}
                <Card className="overflow-hidden border border-slate-200 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <TableHeader>Employee Profile</TableHeader>
                                    <TableHeader>Assigned Location</TableHeader>
                                    <TableHeader>Role</TableHeader>
                                    <TableHeader>Status</TableHeader>
                                    <TableHeader>Actions</TableHeader>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400">Loading Network Data...</td>
                                    </tr>
                                ) : filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400">No employees found matching criteria.</td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map((emp) => (
                                        <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-200">
                                                        {emp.image ? (
                                                            <img src={emp.image} alt={emp.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            emp.name[0]
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{emp.name}</p>
                                                        <p className="text-xs text-slate-500">{emp.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                                                    <MapPin size={12} />
                                                    {emp.shopLocation || 'Unassigned'}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="capitalize text-slate-700 font-medium text-sm">{emp.role}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                    {emp.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(emp._id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
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

export default AdminNetwork;
