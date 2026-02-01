import React, { useState, useEffect, useRef } from 'react';
import { Camera, User, Package, DollarSign, CheckCircle, XCircle, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import QrScanner from 'qr-scanner';
import io from 'socket.io-client';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import API_URL from '../config/api';

const ScanDispense = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addToast } = useToast();

    // Steps: 1: Scan, 2: Details, 3: Face Auth, 3.5: Auth Success, 4: Payment, 5: Dispense Success
    const [step, setStep] = useState(1);
    const [currentUser, setCurrentUser] = useState(null);
    const [scannedData, setScannedData] = useState(null);

    // Scanner
    const videoRef = useRef(null);
    const scannerRef = useRef(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');

    // Flow State
    const [selectedMemberId, setSelectedMemberId] = useState('HEAD');
    const [rationDetails, setRationDetails] = useState({ rice: 0, dhal: 0, cost: 0 });
    const [selectedRations, setSelectedRations] = useState({ rice: true, dhal: true });
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [isProcessing, setIsProcessing] = useState(false);

    const SOCKET_URL = API_URL;

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setCurrentUser(JSON.parse(user));

        // Auto-start via URL
        const query = new URLSearchParams(location.search);
        if (query.get('start') === 'true' && step === 1) startScanner();

        return () => stopScanner();
    }, []);

    // --- LOGIC: RATION CALCULATION ---
    useEffect(() => {
        if (scannedData) {
            const isBPL = (scannedData.financialStatus || 'Below Poverty') === 'Below Poverty';
            let riceKg = 0, dhalKg = 0;

            // Head
            const headAge = scannedData.age || 30;
            riceKg += isBPL ? (headAge >= 18 ? 0.3 : 0.15) : (headAge >= 18 ? 0.1 : 0.05);
            dhalKg += isBPL ? (headAge >= 18 ? 0.2 : 0.1) : (headAge >= 18 ? 0.1 : 0.05);

            // Members
            scannedData.members.forEach(m => {
                const age = m.age || 0;
                riceKg += isBPL ? (age >= 18 ? 0.3 : 0.15) : (age >= 18 ? 0.1 : 0.05);
                dhalKg += isBPL ? (age >= 18 ? 0.2 : 0.1) : (age >= 18 ? 0.1 : 0.05);
            });

            // Cap at 3kg per request
            riceKg = Math.min(riceKg, 3.0);
            dhalKg = Math.min(dhalKg, 3.0);

            const finalRice = selectedRations.rice ? riceKg : 0;
            const finalDhal = selectedRations.dhal ? dhalKg : 0;

            setRationDetails({
                rice: finalRice,
                dhal: finalDhal,
                maxRice: riceKg,
                maxDhal: dhalKg,
                cost: (finalRice * 100) + (finalDhal * 200)
            });
        }
    }, [scannedData, selectedRations]);

    // --- LOGIC: SCANNER ---
    const startScanner = async () => {
        if (isScanning) return;
        setScanError('');
        try {
            const scanner = new QrScanner(
                videoRef.current,
                (result) => processScan(result.data),
                { returnDetailedScanResult: true, highlightScanRegion: true, maxScansPerSecond: 25 }
            );
            scannerRef.current = scanner;
            const devices = await QrScanner.listCameras(true);
            setCameras(devices);
            if (selectedCamera) await scanner.setCamera(selectedCamera);
            await scanner.start();
            setIsScanning(true);
        } catch (err) {
            setScanError("Camera Error: " + err.message);
        }
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.stop();
            scannerRef.current.destroy();
            scannerRef.current = null;
            setIsScanning(false);
        }
    };

    const processScan = async (cardId) => {
        if (step !== 1) return;
        try {
            const res = await fetch(`${API_URL} /beneficiaries/card / ${cardId} `);
            if (res.ok) {
                const data = await res.json();
                setScannedData({ ...data, members: data.familyMembers || [] });
                setSelectedMemberId('HEAD');
                stopScanner();
                setStep(2);
                addToast("Beneficiary Found", 'success');
            } else {
                addToast("Invalid Card", 'error');
            }
        } catch (err) {
            addToast("Network Error", 'error');
        }
    };

    // --- LOGIC: FACE AUTH ---
    const startFaceAuth = () => {
        setStep(3);
        setScanError('');
        setTimeout(startScanner, 100);
    };

    useEffect(() => {
        if (step === 3 && isScanning && !scanError) {
            const timer = setTimeout(captureFace, 2000); // Auto-capture after 2s
            return () => clearTimeout(timer);
        }
    }, [step, isScanning]);

    const captureFace = async () => {
        if (!videoRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
        const liveImage = canvas.toDataURL("image/jpeg");

        try {
            const res = await fetch(`${API_URL}/verify-face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId: scannedData.card, liveImage, memberId: selectedMemberId })
            });
            const data = await res.json();

            if (data.success && data.authenticated) {
                stopScanner();
                setStep(3.5); // Success Pulse
                setTimeout(() => setStep(4), 1500); // To Payment
            } else {
                addToast(data.message || "Face Mismatch", 'error');
                setTimeout(() => setStep(2), 1500); // Back to Details
            }
        } catch (err) {
            addToast("Auth Error", 'error');
            setStep(2);
        }
    };

    // --- LOGIC: DISPENSE ---
    const handleDispense = async () => {
        setIsProcessing(true);
        try {
            const payload = {
                cardId: scannedData.card,
                beneficiaryId: scannedData._id,
                employeeEmail: currentUser.email,
                items: [
                    selectedRations.rice && { item: 'Rice', qty: rationDetails.rice, unit: 'kg', price: 100 },
                    selectedRations.dhal && { item: 'Dhal', qty: rationDetails.dhal, unit: 'kg', price: 200 }
                ].filter(Boolean),
                totalAmount: rationDetails.cost,
                paymentMode,
                authMode: 'FaceID'
            };

            const res = await fetch(`${API_URL}/dispense`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setStep(5);
                addToast("Dispense Successful", 'success');
            } else {
                throw new Error("Failed");
            }
        } catch (err) {
            addToast("Dispense Failed", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // --- RENDER HELPERS ---
    const ScanView = () => (
        <div className="relative w-full aspect-[4/5] bg-black rounded-3xl overflow-hidden border border-slate-200 shadow-inner">
            <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" muted playsInline />

            {/* Overlay UI */}
            <div className="absolute inset-0 border-[24px] border-black/30 pointer-events-none rounded-3xl" />

            {/* Guide for Face */}
            {step === 3 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 rounded-full border-4 border-brand-400/50 shadow-[0_0_50px_rgba(99,102,241,0.3)] animate-pulse" />
                    <p className="absolute mt-80 text-white font-bold tracking-widest bg-black/50 px-4 py-1 rounded-full backdrop-blur-md">ALIGN FACE</p>
                </div>
            )}

            {!isScanning && (
                <div className="absolute inset-0 bg-slate-900 rounded-3xl flex flex-col items-center justify-center text-white">
                    <Camera size={64} className="mb-6 opacity-50" />
                    <Button onClick={startScanner} className="bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-500/30 px-8 py-4 rounded-full text-lg font-bold transition-transform hover:scale-105">
                        Start Camera
                    </Button>
                    {/* Simulations */}
                    <div className="mt-8 flex gap-2 opacity-50">
                        <button onClick={() => processScan('RC-1001')} className="text-xs bg-white/10 px-2 py-1 rounded">Sim 1001</button>
                        <button onClick={() => processScan('RC-1003')} className="text-xs bg-white/10 px-2 py-1 rounded">Sim 1003</button>
                    </div>
                </div>
            )}

            {scanError && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-red-500 p-8 text-center">
                    <AlertTriangle size={48} className="mb-4" />
                    <p>{scanError}</p>
                    <Button variant="outline" className="mt-4 border-red-500 text-red-500" onClick={() => startScanner()}>Retry</Button>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            {/* Header */}
            <div className="max-w-6xl mx-auto flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Distribution Console</h1>
                    <p className="text-slate-500 text-sm">Operator: <span className="font-semibold text-brand-600">{currentUser?.name}</span></p>
                </div>
                <Button variant="outline" onClick={() => navigate('/history')} className="gap-2">
                    <Clock size={16} /> History
                </Button>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT COLUMN: SCANNER & VISUALS */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Scanner Viewport */}
                    {(step === 1 || step === 3 || isScanning) && <ScanView />}

                    {/* Beneficiary Profile (Visible after scan) */}
                    {(step >= 2 && step < 5) && scannedData && (
                        <Card className="p-6 bg-white border-brand-100 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-brand-500 to-indigo-600 opacity-10" />
                            <div className="relative z-10 flex flex-col items-center -mt-2">
                                <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100">
                                    <img
                                        src={scannedData.image || ''}
                                        onError={(e) => e.target.src = 'https://ui-avatars.com/api/?name=User'}
                                        alt="User"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <h2 className="text-xl font-bold mt-4">{scannedData.name}</h2>
                                <p className="text-sm text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded mt-1">{scannedData.card}</p>
                            </div>

                            {/* Member Selector */}
                            <div className="mt-6 space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase">Select Member Present</p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setSelectedMemberId('HEAD')}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedMemberId === 'HEAD' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Head ({scannedData.name})
                                    </button>
                                    {scannedData.members.map(m => (
                                        <button
                                            key={m._id}
                                            onClick={() => setSelectedMemberId(m._id)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedMemberId === m._id ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            {m.name} ({m.age}y)
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Success State */}
                    {step === 5 && (
                        <Card className="p-10 bg-emerald-600 text-white text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                <ShoppingBag size={48} />
                            </div>
                            <h2 className="text-3xl font-bold mb-2">Dispensed!</h2>
                            <p className="text-emerald-100 mb-8">Transaction recorded successfully.</p>
                            <Button onClick={() => { setStep(1); setScannedData(null); }} className="bg-white text-emerald-800 hover:bg-emerald-50 w-full">
                                Process Next
                            </Button>
                        </Card>
                    )}
                </div>

                {/* RIGHT COLUMN: CONTROLS */}
                <div className="lg:col-span-7 flex flex-col gap-6">

                    {step === 1 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <Camera size={64} className="text-slate-400 mb-4" />
                            <p className="text-xl font-bold text-slate-400">Scan Card to Begin</p>
                        </div>
                    )}

                    {step === 2 && (
                        <Card className="p-8">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <ShoppingBag className="text-brand-600" size={24} /> Ration Entitlement
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div
                                    onClick={() => setSelectedRations(p => ({ ...p, rice: !p.rice }))}
                                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedRations.rice ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-slate-700">Rice</span>
                                        {selectedRations.rice && <CheckCircle size={20} className="text-brand-600" />}
                                    </div>
                                    <p className="text-3xl font-bold text-brand-900">{(rationDetails.maxRice || 0).toFixed(1)} <span className="text-sm opacity-50">kg</span></p>
                                    <p className="text-xs text-slate-400 mt-1">₹100 / kg</p>
                                </div>

                                <div
                                    onClick={() => setSelectedRations(p => ({ ...p, dhal: !p.dhal }))}
                                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedRations.dhal ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-slate-700">Dhal</span>
                                        {selectedRations.dhal && <CheckCircle size={20} className="text-orange-600" />}
                                    </div>
                                    <p className="text-3xl font-bold text-orange-900">{(rationDetails.maxDhal || 0).toFixed(1)} <span className="text-sm opacity-50">kg</span></p>
                                    <p className="text-xs text-slate-400 mt-1">₹200 / kg</p>
                                </div>
                            </div>

                            <div className="bg-slate-900 p-6 rounded-2xl text-white flex justify-between items-center shadow-xl">
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wider">Total Amount</p>
                                    <p className="text-3xl font-bold">₹ {(rationDetails.cost || 0).toFixed(0)}</p>
                                </div>
                                <Button onClick={startFaceAuth} className="bg-brand-500 hover:bg-brand-400 text-white px-8">
                                    Verify Biometric <ArrowRight size={18} className="ml-2" />
                                </Button>
                            </div>
                        </Card>
                    )}

                    {(step === 4 || step === 3.5) && (
                        <Card className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Banknote className="text-emerald-600" size={24} /> Payment
                            </h3>

                            <div className="flex gap-4 mb-8">
                                <button
                                    onClick={() => setPaymentMode('Cash')}
                                    className={`flex-1 p-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${paymentMode === 'Cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                >
                                    <Banknote size={24} /> Cash
                                </button>
                                <button
                                    onClick={() => setPaymentMode('UPI')}
                                    className={`flex-1 p-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${paymentMode === 'UPI' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                >
                                    <Zap size={24} /> UPI
                                </button>
                            </div>

                            {paymentMode === 'Cash' ? (
                                <div className="text-center p-8 bg-emerald-50/50 rounded-2xl border border-emerald-100 mb-8">
                                    <p className="text-emerald-800 font-medium">Collect from Beneficiary</p>
                                    <p className="text-5xl font-bold text-slate-900 mt-2">₹ {rationDetails.cost}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-6 bg-blue-50/50 rounded-2xl border border-blue-100 mb-8">
                                    <div className="bg-white p-2 rounded-lg shadow-sm mb-4">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=shop@okaxis&am=${rationDetails.cost}`} className="w-32 h-32" />
                                    </div>
                                    <p className="text-blue-800 font-bold">Scan to Pay ₹ {rationDetails.cost}</p>
                                </div>
                            )}

                            <Button
                                onClick={handleDispense}
                                isLoading={isProcessing}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30 py-4 text-lg"
                            >
                                Confirm & Dispense
                            </Button>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScanDispense;
