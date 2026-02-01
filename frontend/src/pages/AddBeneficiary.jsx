import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, User, Users, MapPin, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import API_URL from '../config/api';

const AddBeneficiary = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addToast } = useToast();


    const [currentUser, setCurrentUser] = useState(null);
    const [shops, setShops] = useState([]);

    // Parse Initial Mode
    const getInitialMode = () => {
        const params = new URLSearchParams(location.search);
        return params.get('mode') === 'update' ? 'update' : 'add';
    };

    const [mode, setMode] = useState(getInitialMode());
    const [searchCardId, setSearchCardId] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        card: '',
        financialStatus: 'Below Poverty',
        gender: 'Male',
        address: '',
        assignedShop: '',
        image: '',
        familyMembers: []
    });

    const [showCamera, setShowCamera] = useState(false);
    const [activePhotoTarget, setActivePhotoTarget] = useState('head');
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
            setFormData(p => ({ ...p, assignedShop: user.shopLocation || '' }));
            fetchShops();
        } else {
            navigate('/');
        }
    }, []);

    const fetchShops = async () => {
        try {
            const res = await fetch(`${API_URL}/shops`);
            setShops(await res.json());
        } catch (err) { }
    };

    const resetForm = () => {
        setFormData({
            name: '', age: '', card: '',
            financialStatus: 'Below Poverty', gender: 'Male',
            address: '', assignedShop: currentUser?.shopLocation || '',
            image: '', familyMembers: []
        });
        setSearchCardId('');
    };

    const handleSearch = async () => {
        if (!searchCardId.trim()) return addToast("Enter Card ID", "error");
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/beneficiaries/card/${searchCardId.trim()}`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    ...data,
                    // Ensure defaults
                    financialStatus: data.financialStatus || 'Below Poverty',
                    gender: data.gender || 'Male',
                    assignedShop: data.assignedShop || '',
                    familyMembers: data.familyMembers || []
                });
                addToast("Beneficiary Found", "success");
            } else {
                addToast("Beneficiary not found", "error");
                resetForm();
            }
        } catch (err) {
            addToast("Search Failed", "error");
        } finally {
            setLoading(false);
        }
    };

    // Camera Logic
    const startCamera = async (target) => {
        setActivePhotoTarget(target);
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            // Delay slightly to let modal mount
            setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
        } catch (err) {
            addToast("Camera Error", "error");
            setShowCamera(false);
        }
    };

    const takePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');

        if (activePhotoTarget === 'head') setFormData(p => ({ ...p, image: dataUrl }));
        else {
            const updated = [...formData.familyMembers];
            updated[activePhotoTarget].image = dataUrl;
            setFormData(p => ({ ...p, familyMembers: updated }));
        }
        stopCamera();
    };

    const stopCamera = () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        setShowCamera(false);
    };

    const handleFileChange = (e, target) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (target === 'head') setFormData(p => ({ ...p, image: reader.result }));
                else {
                    const updated = [...formData.familyMembers];
                    updated[target].image = reader.result;
                    setFormData({ ...formData, familyMembers: updated });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                submittedBy: currentUser.email,
                requestType: mode === 'update' ? 'UPDATE' : 'NEW',
                data: {
                    ...formData,
                    members: 1 + formData.familyMembers.length,
                    assignedShop: formData.assignedShop || currentUser.shopLocation || 'Main Office'
                }
            };

            const res = await fetch(`${API_URL}/beneficiary-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                addToast("Request Submitted. Awaiting Approval.", 'success');
                navigate('/home');
            } else {
                addToast(data.error || "Submission Failed", 'error');
            }
        } catch (err) {
            addToast("Network Error", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
                            <ArrowLeft size={24} />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {mode === 'add' ? 'New Registration' : 'Update Beneficiary'}
                            </h1>
                            <p className="text-slate-500 text-sm">
                                {mode === 'add' ? 'Submit new beneficiary application' : 'Modify existing beneficiary details'}
                            </p>
                        </div>
                    </div>

                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                        <button
                            id="btn-mode-new"
                            onClick={() => { setMode('add'); resetForm(); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'add' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            New Request
                        </button>
                        <button
                            id="btn-mode-update"
                            onClick={() => { setMode('update'); resetForm(); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'update' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Update Existing
                        </button>
                    </div>
                </div>

                {/* Search Box (Update Mode) */}
                {mode === 'update' && (
                    <Card className="p-6 mb-8 flex flex-col md:flex-row gap-4 items-end bg-gradient-to-r from-indigo-50 to-white border-indigo-100">
                        <div className="flex-1 w-full">
                            <Input
                                label="Search by Smart Card ID"
                                icon={Search}
                                placeholder="e.g. TN-722824106120"
                                value={searchCardId}
                                onChange={e => setSearchCardId(e.target.value)}
                                className="bg-white"
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            isLoading={loading}
                            className="w-full md:w-auto bg-slate-800 text-white"
                        >
                            Search Records
                        </Button>
                    </Card>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Main Beneficiary Info */}
                    <Card className="p-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <User className="text-indigo-600" size={20} /> Head of Family Details
                        </h3>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Photo */}
                            <div className="flex flex-col items-center gap-3 shrink-0">
                                <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg relative group">
                                    {formData.image ? (
                                        <img src={formData.image} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={48} /></div>
                                    )}
                                    {formData.image && (
                                        <button type="button" onClick={() => setFormData(p => ({ ...p, image: '' }))} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full shadow-md"><Trash2 size={12} /></button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <label className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer text-slate-600" title="Upload"><Upload size={16} />
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'head')} />
                                    </label>
                                    <button type="button" onClick={() => startCamera('head')} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"><Camera size={16} /></button>
                                </div>
                            </div>

                            {/* Fields */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input label="Full Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                <Input label="Ration Card Number" icon={CreditCard} required value={formData.card} onChange={e => setFormData({ ...formData, card: e.target.value })} />

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Financial Status</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500 text-sm font-medium"
                                        value={formData.financialStatus} onChange={e => setFormData({ ...formData, financialStatus: e.target.value })}>
                                        <option value="Below Poverty">Below Poverty (Green)</option>
                                        <option value="Above Poverty">Above Poverty (White)</option>
                                    </select>
                                </div>

                                <Input label="Age" type="number" required value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />

                                <div className="md:col-span-2">
                                    <Input label="Address" icon={MapPin} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>

                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Assigned Shop</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500 text-sm font-medium"
                                        value={formData.assignedShop} onChange={e => setFormData({ ...formData, assignedShop: e.target.value })}>
                                        <option value="">Select Shop location...</option>
                                        {shops.map(s => <option key={s._id} value={s.tehsil}>{s.tehsil} ({s.address})</option>)}
                                        {currentUser?.shopLocation && !shops.find(s => s.tehsil === currentUser.shopLocation) &&
                                            <option value={currentUser.shopLocation}>{currentUser.shopLocation} (Current)</option>
                                        }
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Family Members */}
                    <Card className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Users className="text-indigo-600" size={20} /> Family Members
                            </h3>
                            <Button type="button" onClick={() => setFormData(p => ({ ...p, familyMembers: [...p.familyMembers, { name: '', age: '', gender: 'Male', relation: 'Child' }] }))} size="sm" className="gap-2">
                                <Plus size={16} /> Add Member
                            </Button>
                        </div>

                        {formData.familyMembers.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                No family members added.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formData.familyMembers.map((member, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-start relative group">
                                        <button type="button" onClick={() => {
                                            const updated = formData.familyMembers.filter((_, i) => i !== idx);
                                            setFormData({ ...formData, familyMembers: updated });
                                        }} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>

                                        <div className="w-16 h-16 rounded-full bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer relative"
                                            onClick={() => startCamera(idx)}>
                                            {member.image ? <img src={member.image} className="w-full h-full object-cover" /> : <Camera size={20} className="text-slate-300" />}
                                        </div>

                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                                            <div className="col-span-2 md:col-span-1">
                                                <input placeholder="Name" className="w-full p-2 rounded-lg text-sm border border-slate-200 outline-none focus:border-indigo-500"
                                                    value={member.name} onChange={e => {
                                                        const u = [...formData.familyMembers]; u[idx].name = e.target.value;
                                                        setFormData({ ...formData, familyMembers: u });
                                                    }}
                                                />
                                            </div>
                                            <input placeholder="Age" type="number" className="w-full p-2 rounded-lg text-sm border border-slate-200 outline-none focus:border-indigo-500"
                                                value={member.age} onChange={e => {
                                                    const u = [...formData.familyMembers]; u[idx].age = e.target.value;
                                                    setFormData({ ...formData, familyMembers: u });
                                                }}
                                            />
                                            <select className="w-full p-2 rounded-lg text-sm border border-slate-200 outline-none focus:border-indigo-500"
                                                value={member.gender} onChange={e => {
                                                    const u = [...formData.familyMembers]; u[idx].gender = e.target.value;
                                                    setFormData({ ...formData, familyMembers: u });
                                                }}>
                                                <option>Male</option><option>Female</option>
                                            </select>
                                            <select className="w-full p-2 rounded-lg text-sm border border-slate-200 outline-none focus:border-indigo-500"
                                                value={member.relation} onChange={e => {
                                                    const u = [...formData.familyMembers]; u[idx].relation = e.target.value;
                                                    setFormData({ ...formData, familyMembers: u });
                                                }}>
                                                <option>Child</option><option>Spouse</option><option>Parent</option><option>Sibling</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Submit Bar */}
                    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 md:px-8 flex justify-between items-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Headcount</p>
                            <p className="text-xl font-bold text-slate-900">{1 + formData.familyMembers.length} <span className="text-sm font-normal text-slate-500">Members</span></p>
                        </div>
                        <Button type="submit" isLoading={isSubmitting} className="px-8 bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200">
                            Submit Request
                        </Button>
                    </div>
                </form>
                <div className="h-24" /> {/* Spacer for fixed footer */}
            </div>

            {/* Camera Overlay */}
            {showCamera && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-lg aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 relative mb-6">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-800" onClick={stopCamera}>Cancel</Button>
                        <Button onClick={takePhoto} className="bg-white text-black hover:bg-slate-200 px-8">Capture</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddBeneficiary;
