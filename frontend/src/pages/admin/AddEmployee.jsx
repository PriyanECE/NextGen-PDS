import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, Camera, Mail, Lock, User, MapPin } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { useToast } from '../../context/ToastContext';
import API_URL from '../../config/api';

const AddEmployee = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();


    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        shopLocation: '',
        gender: 'Male',
        image: ''
    });

    const [isCapturing, setIsCapturing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const videoRef = useRef(null);

    const startCamera = async () => {
        setIsCapturing(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            addToast("Camera Error: " + err.message, 'error');
            setIsCapturing(false);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
        const imgParams = canvas.toDataURL("image/jpeg");
        setFormData(prev => ({ ...prev, image: imgParams }));

        const stream = videoRef.current.srcObject;
        if (stream) stream.getTracks().forEach(t => t.stop());
        setIsCapturing(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/employees/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                addToast("Employee Added Successfully", 'success');
                navigate('/admin/network');
            } else {
                addToast(data.error || "Failed to add employee", 'error');
            }
        } catch (err) {
            addToast("Network Error", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">New Employee</h1>
                        <p className="text-slate-500 text-sm">Register staff for shop network</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card className="p-8">
                        <div className="flex flex-col md:flex-row gap-8">

                            {/* Photo Section */}
                            <div className="flex flex-col items-center gap-4 shrink-0">
                                <div className="w-40 h-40 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-xl relative ring-1 ring-slate-100 group">
                                    {isCapturing ? (
                                        <video ref={videoRef} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
                                    ) : formData.image ? (
                                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                            <User size={48} />
                                        </div>
                                    )}

                                    {!isCapturing && (
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={startCamera}>
                                            <Camera className="text-white" />
                                        </div>
                                    )}
                                </div>

                                {isCapturing ? (
                                    <div className="flex gap-2">
                                        <Button type="button" variant="danger" size="sm" onClick={() => setIsCapturing(false)}>Cancel</Button>
                                        <Button type="button" onClick={capturePhoto} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white border-none">Capture</Button>
                                    </div>
                                ) : (
                                    <Button type="button" variant="secondary" size="sm" onClick={startCamera} icon={Camera}>
                                        {formData.image ? 'Retake Photo' : 'Upload Photo'}
                                    </Button>
                                )}
                            </div>

                            {/* Fields */}
                            <div className="flex-1 space-y-5">
                                <Input
                                    label="Full Name"
                                    placeholder="e.g. Rahul Kumar"
                                    value={formData.name}
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                    required
                                />
                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="employee@smartpds.com"
                                    value={formData.email}
                                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                    required
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Location</label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-medium text-slate-700 appearance-none"
                                                value={formData.shopLocation}
                                                onChange={e => setFormData(p => ({ ...p, shopLocation: e.target.value }))}
                                            >
                                                <option value="">Select District</option>
                                                <option value="Chennai North">Chennai North</option>
                                                <option value="Chennai South">Chennai South</option>
                                                <option value="Coimbatore">Coimbatore</option>
                                                <option value="Madurai">Madurai</option>
                                                <option value="Salem">Salem</option>
                                                <option value="Trichy">Trichy</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Gender</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl h-[50px]">
                                            {['Male', 'Female'].map(g => (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, gender: g }))}
                                                    className={`flex-1 rounded-lg text-sm font-bold transition-all ${formData.gender === g ? 'bg-white shadow text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
                            <Button type="submit" isLoading={isLoading} className="px-8">
                                <Save size={18} className="mr-2" /> Register Employee
                            </Button>
                        </div>
                    </Card>
                </form>
            </div>
        </div>
    );
};

export default AddEmployee;
