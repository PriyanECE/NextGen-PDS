import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, Users, Save, ArrowLeft, Plus, Trash2, MapPin, Camera, Upload, X, Search, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AddBeneficiary = () => {
    // ... setup ...
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [currentUser, setCurrentUser] = useState(null);
    const API_URL = 'http://localhost:5000/api';

    const [shops, setShops] = useState([]);

    useEffect(() => {
        // ... user load ...
        const user = localStorage.getItem('user');
        if (user) {
            const parsedUser = JSON.parse(user);
            setCurrentUser(parsedUser);
            setFormData(prev => ({ ...prev, assignedShop: parsedUser.shopLocation || '' }));
        } else {
            navigate('/');
        }
        fetchShops();
    }, [navigate]);

    const fetchShops = async () => {
        try {
            const res = await fetch(`${API_URL}/shops`);
            const data = await res.json();
            setShops(data);
        } catch (err) { addToast("Failed to fetch shops", 'error'); }
    };

    const [mode, setMode] = useState('add'); // 'add' | 'update'
    const [searchCardId, setSearchCardId] = useState('');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        card: '',
        financialStatus: 'Below Poverty', // Default
        gender: 'Male',
        address: '',
        assignedShop: '',
        image: '',
        familyMembers: []
    });

    const resetForm = () => {
        setFormData({
            name: '',
            age: '',
            card: '',
            financialStatus: 'Below Poverty',
            gender: 'Male',
            address: '',
            assignedShop: currentUser?.shopLocation || '',
            image: '',
            familyMembers: []
        });
        setSearchCardId('');
    };

    const handleSearch = async () => {
        if (!searchCardId.trim()) return addToast("Please enter a Card ID", "error");
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/beneficiaries/card/${searchCardId.trim()}`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    name: data.name || '',
                    age: data.age || '', // Added missing age field
                    card: data.card || '',
                    financialStatus: data.financialStatus || 'Below Poverty',
                    gender: data.gender || 'Male',
                    address: data.address || '',
                    assignedShop: data.assignedShop || '',
                    image: data.image || '',
                    familyMembers: data.familyMembers || []
                });
                addToast("Beneficiary Details Loaded", "success");
            } else {
                addToast("Beneficiary not found", "error");
                resetForm();
            }
        } catch (err) {
            addToast("Search failed", "error");
        } finally {
            setLoading(false);
        }
    };

    const [showCamera, setShowCamera] = useState(false);
    const [activePhotoTarget, setActivePhotoTarget] = useState('head'); // 'head' or index (0, 1, 2...)
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const handleFileChange = (e, target) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                if (target === 'head') {
                    setFormData(prev => ({ ...prev, image: result }));
                } else {
                    const updated = [...formData.familyMembers];
                    updated[target].image = result;
                    setFormData({ ...formData, familyMembers: updated });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async (target) => {
        setActivePhotoTarget(target);
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            addToast("Camera access denied", "error");
            setShowCamera(false);
        }
    };

    const takePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');

            if (activePhotoTarget === 'head') {
                setFormData(prev => ({ ...prev, image: dataUrl }));
            } else {
                const updated = [...formData.familyMembers];
                updated[activePhotoTarget].image = dataUrl;
                setFormData({ ...formData, familyMembers: updated });
            }
            stopCamera();
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const handleAddMember = () => {
        setFormData({
            ...formData,
            familyMembers: [...formData.familyMembers, { name: '', age: '', gender: 'Male', relation: 'Child' }]
        });
    };

    const handleRemoveMember = (index) => {
        const updated = formData.familyMembers.filter((_, i) => i !== index);
        setFormData({ ...formData, familyMembers: updated });
    };

    const handleMemberChange = (index, field, value) => {
        const updated = [...formData.familyMembers];
        updated[index][field] = value;
        setFormData({ ...formData, familyMembers: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

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
                addToast("Request Submitted Successfully! Admin will review.", 'success');
                navigate('/home');
            } else {
                addToast(`Error: ${data.error}`, 'error');
            }
        } catch (err) {
            addToast("Submission failed: " + err.message, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex justify-center">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/home')} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">
                                {mode === 'add' ? 'New Beneficiary Request' : 'Update Beneficiary'}
                            </h1>
                            <p className="text-pink-100 text-sm">
                                {mode === 'add' ? 'Fill in details to request addition to database' : 'Search and update existing beneficiary details'}
                            </p>
                        </div>
                    </div>
                    {/* Mode Toggle */}
                    <div className="flex bg-white/20 p-1 rounded-xl">
                        <button
                            onClick={() => { setMode('add'); resetForm(); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'add' ? 'bg-white text-pink-600 shadow-lg' : 'text-white hover:bg-white/10'}`}
                        >
                            New Request
                        </button>
                        <button
                            onClick={() => { setMode('update'); resetForm(); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'update' ? 'bg-white text-pink-600 shadow-lg' : 'text-white hover:bg-white/10'}`}
                        >
                            Update Existing
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Search Section for Update Mode */}
                    {mode === 'update' && (
                        <div className="bg-slate-100 p-6 rounded-2xl flex flex-col md:flex-row gap-4 items-end border border-slate-200">
                            <div className="w-full">
                                <label className="block text-sm font-medium text-slate-600 mb-1">Search by Ration Card Number</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                    <input
                                        className="w-full pl-10 p-3 border rounded-xl bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                        placeholder="Enter Card ID (e.g. TN-722824106120)"
                                        value={searchCardId}
                                        onChange={e => setSearchCardId(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                                Search
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Section 0: Beneficiary Image */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-4">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center">
                                    {formData.image ? (
                                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={64} className="text-slate-300" />
                                    )}
                                </div>
                                {formData.image && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, image: '' })}
                                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-4">
                                {/* Upload Button */}
                                <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors font-medium text-sm">
                                    <Upload size={18} /> Upload Photo
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'head')} />
                                </label>

                                {/* Camera Button */}
                                <button
                                    type="button"
                                    onClick={() => startCamera('head')}
                                    className="flex items-center gap-2 px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl transition-colors font-medium text-sm"
                                >
                                    <Camera size={18} /> Take Photo
                                </button>
                            </div>
                        </div>

                        {/* Camera Modal */}
                        {showCamera && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg">
                                    <div className="relative bg-black aspect-video flex items-center justify-center">
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-6 flex justify-between items-center bg-white">
                                        <button
                                            type="button"
                                            onClick={stopCamera}
                                            className="text-slate-500 hover:text-slate-700 font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={takePhoto}
                                            className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold shadow-lg flex items-center gap-2"
                                        >
                                            <Camera size={18} /> Capture
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Section 1: Head of Family */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <User className="text-pink-500" /> Head of Family Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
                                    <input required className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                        placeholder="e.g. Ramesh Gupta"
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Ration Card Number</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                        <input required className="w-full pl-10 p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                            placeholder="e.g. RC-123456"
                                            value={formData.card} onChange={e => setFormData({ ...formData, card: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Financial Status</label>
                                    <select className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-pink-500 outline-none"
                                        value={formData.financialStatus} onChange={e => setFormData({ ...formData, financialStatus: e.target.value })}>
                                        <option value="Below Poverty">Below Poverty (Green Card)</option>
                                        <option value="Above Poverty">Above Poverty (White Card)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Gender</label>
                                    <select className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-pink-500 outline-none"
                                        value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Age</label>
                                    <input required type="number" className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                        placeholder="e.g. 45"
                                        value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Address (Optional)</label>
                                    <input className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                        placeholder="Village / Town"
                                        value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>

                                {/* Shop Selection */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Assigned Ration Shop</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                        <select
                                            className="w-full pl-10 p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-pink-500 outline-none transition-all appearance-none"
                                            value={formData.assignedShop}
                                            onChange={e => setFormData({ ...formData, assignedShop: e.target.value })}
                                        >
                                            <option value="">-- Select Shop --</option>
                                            {shops.map(shop => (
                                                <option key={shop._id || shop.code} value={shop.name}>{shop.name} ({shop.address})</option>
                                            ))}
                                            {/* Fallback if user's shop isn't in list */}
                                            {currentUser?.shopLocation && !shops.find(s => s.name === currentUser.shopLocation) && (
                                                <option value={currentUser.shopLocation}>{currentUser.shopLocation} (My Shop)</option>
                                            )}
                                        </select>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Beneficiary will be linked to this shop.</p>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Section 2: Family Members */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Users className="text-pink-500" /> Family Members
                                </h3>
                                <button type="button" onClick={handleAddMember} className="text-pink-600 font-bold text-sm bg-pink-50 px-4 py-2 rounded-lg hover:bg-pink-100 transition-colors flex items-center gap-2">
                                    <Plus size={16} /> Add Member
                                </button>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                                {formData.familyMembers.length === 0 && (
                                    <p className="text-center text-slate-400 py-4">No family members added yet.</p>
                                )}
                                {formData.familyMembers.map((member, index) => (
                                    <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative group">
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button type="button" onClick={() => handleRemoveMember(index)} className="text-red-400 hover:text-red-600 p-1">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Member {index + 1}</h4>
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Member Photo */}
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200 flex items-center justify-center relative group/img">
                                                    {member.image ? (
                                                        <img src={member.image} alt="Member" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={32} className="text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <label className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer" title="Upload">
                                                        <Upload size={14} />
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, index)} />
                                                    </label>
                                                    <button type="button" onClick={() => startCamera(index)} className="p-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100" title="Camera">
                                                        <Camera size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Member Details */}
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <input placeholder="Member Name" required className="w-full p-2 border rounded-lg text-sm"
                                                        value={member.name} onChange={e => handleMemberChange(index, 'name', e.target.value)} />
                                                </div>
                                                <div>
                                                    <input placeholder="Age" required type="number" className="w-full p-2 border rounded-lg text-sm"
                                                        value={member.age} onChange={e => handleMemberChange(index, 'age', e.target.value)} />
                                                </div>
                                                <div className="flex gap-2">
                                                    <select className="w-1/2 p-2 border rounded-lg text-sm"
                                                        value={member.gender} onChange={e => handleMemberChange(index, 'gender', e.target.value)}>
                                                        <option>Male</option>
                                                        <option>Female</option>
                                                        <option>Other</option>
                                                    </select>
                                                    <select className="w-1/2 p-2 border rounded-lg text-sm"
                                                        value={member.relation} onChange={e => handleMemberChange(index, 'relation', e.target.value)}>
                                                        <option>Spouse</option>
                                                        <option>Child</option>
                                                        <option>Parent</option>
                                                        <option>Sibling</option>
                                                        <option>Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Stats & Submit */}
                        <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <p className="text-slate-400 text-sm">Total Members to Register</p>
                                <p className="text-3xl font-bold">{1 + formData.familyMembers.length} <span className="text-lg text-slate-600 font-normal">Person(s)</span></p>
                            </div>
                            <button type="submit" className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 rounded-xl font-bold shadow-lg shadow-rose-900/30 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                                <Save size={20} /> Submit Request
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddBeneficiary;
