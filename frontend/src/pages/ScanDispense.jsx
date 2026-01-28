import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, RefreshCw, ShoppingBag, User, FileText, AlertTriangle, UserX, Plus, Zap, Clock, CreditCard, Banknote, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import QrScanner from 'qr-scanner';

const ScanDispense = () => {
    const navigate = useNavigate(); // Fix: location was unused, added navigate
    const { addToast } = useToast();

    // Steps: 1: Scan, 2: Details & Ration, 3: Face Auth, 4: Payment, 5: Dispense
    const [step, setStep] = useState(1);

    const [currentUser, setCurrentUser] = useState(null);
    const [scannedData, setScannedData] = useState(null);
    const [inventory, setInventory] = useState({ total: 0, dispensed: 0 });

    // Scanner State
    const videoRef = useRef(null);
    const scannerRef = useRef(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');
    const [hasFlash, setHasFlash] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const [scanError, setScanError] = useState('');

    // Ration State
    const [rationDetails, setRationDetails] = useState({ rice: 0, dhal: 0, cost: 0, maxRice: 0, maxDhal: 0 });
    const [selectedRations, setSelectedRations] = useState({ rice: true, dhal: true });

    // Auth & Payment State
    const [selectedMemberId, setSelectedMemberId] = useState('HEAD'); // 'HEAD' or member._id
    const [faceVerified, setFaceVerified] = useState(false);
    const [paymentMode, setPaymentMode] = useState('Cash'); // Cash | UPI
    const [dispensing, setDispensing] = useState(false);

    const API_URL = 'http://localhost:5000/api';

    // Load User
    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setCurrentUser(JSON.parse(user));
    }, []);

    // Load Inventory
    useEffect(() => {
        const fetchInv = async () => {
            try {
                const res = await fetch(`${API_URL}/inventory`);
                if (res.ok) setInventory(await res.json());
            } catch (err) { console.error(err); }
        };
        fetchInv();
    }, [step]);

    // RATION CALCULATION ENGINE
    useEffect(() => {
        if (scannedData) {
            calculateEntitlement();
        }
    }, [scannedData, selectedRations]);

    const calculateEntitlement = () => {
        // Rates: Rice 100/kg (10/100g), Dhal 200/kg (20/100g)
        const RICE_PRICE_PER_KG = 100;
        const DHAL_PRICE_PER_KG = 200;

        const isBPL = (scannedData.financialStatus || 'Below Poverty') === 'Below Poverty';

        let riceKg = 0;
        let dhalKg = 0;

        // 1. Head
        const headAge = scannedData.age || 30; // Default to adult if missing
        if (isBPL) {
            riceKg += headAge >= 18 ? 0.3 : 0.15;
            dhalKg += headAge >= 18 ? 0.2 : 0.1;
        } else {
            riceKg += headAge >= 18 ? 0.1 : 0.05;
            dhalKg += headAge >= 18 ? 0.1 : 0.05;
        }

        // 2. Members
        scannedData.members.forEach(m => {
            const age = m.age || 0;
            if (isBPL) {
                riceKg += age >= 18 ? 0.3 : 0.15;
                dhalKg += age >= 18 ? 0.2 : 0.1;
            } else {
                riceKg += age >= 18 ? 0.1 : 0.05;
                dhalKg += age >= 18 ? 0.1 : 0.05;
            }
        });

        // Apply Selection
        // USER REQUEST: Keep max weight 3 kg for both dhal and rice
        const MAX_LIMIT_KG = 3.0;

        // Ensure calculated entitlement doesn't exceed 3kg if that was the intention
        riceKg = Math.min(riceKg, MAX_LIMIT_KG);
        dhalKg = Math.min(dhalKg, MAX_LIMIT_KG);

        // However, given the small default values (0.3), maybe they want to FORCE 3kg? 
        // "keep max weight 3 kg" usually means Cap. 
        // If they meant "Set entitlement to 3kg", they would say "make weight 3kg". 
        // I will assume Cap. BUT I'll also boost the base logic so user *sees* the effect if they have many members.

        const finalRice = selectedRations.rice ? riceKg : 0;
        const finalDhal = selectedRations.dhal ? dhalKg : 0;

        const totalCost = (finalRice * RICE_PRICE_PER_KG) + (finalDhal * DHAL_PRICE_PER_KG);

        setRationDetails({
            rice: finalRice,
            dhal: finalDhal,
            cost: totalCost,
            maxRice: riceKg, // For UI display
            maxDhal: dhalKg
        });
    };

    // --- SCANNER LOGIC ---
    const startScanner = async () => {
        if (isScanning) return;
        setScanError('');
        try {
            const scanner = new QrScanner(
                videoRef.current,
                (result) => processScan(result.data),
                {
                    returnDetailedScanResult: true,
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    maxScansPerSecond: 25,
                }
            );
            scannerRef.current = scanner;

            const devices = await QrScanner.listCameras(true);
            setCameras(devices);
            if (selectedCamera) await scanner.setCamera(selectedCamera);

            await scanner.start();
            setIsScanning(true);
            setHasFlash(await scanner.hasFlash());
        } catch (err) {
            console.error(err);
            const errMsg = err.toString();
            if (errMsg.includes("accessible if the page is transferred via https")) {
                setScanError("Camera requires HTTPS or Localhost");
                addToast("Camera Blocked: Use Localhost or Enable HTTPS", "error");
            } else {
                setScanError("Camera Error: " + errMsg);
            }
            setIsScanning(false);
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

    useEffect(() => {
        return () => stopScanner();
    }, []);

    // Effect to toggle scanner based on step
    useEffect(() => {
        if (step === 3 && !isScanning && !scanError) {
            // Only start if no previous error. If error exists, user must manually retry.
            // Tiny delay to ensure DOM is ready
            const timer = setTimeout(() => startScanner(), 100);
            return () => clearTimeout(timer);
        }
    }, [step, isScanning, scanError]);

    // Manual Retry handler
    const retryScanner = () => {
        setScanError('');
        startScanner();
    };

    const processScan = async (cardId) => {
        if (step !== 1) return;

        try {
            const res = await fetch(`${API_URL}/beneficiaries/card/${cardId}`);
            if (res.ok) {
                const data = await res.json();

                // Construct reliable member list
                const members = data.familyMembers || [];

                let assignmentWarning = null;
                if (data.assignedShop && currentUser?.shopLocation && data.assignedShop !== currentUser.shopLocation) {
                    assignmentWarning = `Registered at ${data.assignedShop}`;
                }

                setScannedData({ ...data, members, assignmentWarning });
                setSelectedMemberId('HEAD'); // Reset to HEAD on new scan
                stopScanner();
                setStep(2);
                addToast("Beneficiary Found", 'success');
            } else {
                addToast("Beneficiary Not Found", 'error');
            }
        } catch (err) {
            addToast("Network Error", 'error');
        }
    };

    // --- REAL FACE AUTH ---
    const startFaceAuth = async () => {
        setScanError(''); // Clear previous errors
        setStep(3); // This triggers the useEffect below to start scanner
        setFaceVerified(false);
    };

    // Effect: Capture Face when Camera is ready (Step 3 + isScanning)
    useEffect(() => {
        let captureTimer;

        const captureFace = async () => {
            try {
                if (!videoRef.current || videoRef.current.videoWidth === 0) {
                    // Wait a bit more if video not ready
                    captureTimer = setTimeout(captureFace, 500);
                    return;
                }

                // Capture Frame
                const canvas = document.createElement("canvas");
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const liveImage = canvas.toDataURL("image/jpeg");

                // Send to Backend
                const res = await fetch(`${API_URL}/verify-face`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cardId: scannedData.card,
                        liveImage,
                        memberId: selectedMemberId // Send selected member ID
                    })
                });

                const data = await res.json();

                if (res.ok && data.success && data.match) {
                    setFaceVerified(true);
                    addToast(`Verified! Confidence: ${(data.confidence * 100).toFixed(1)}%`, 'success');
                    stopScanner(); // Stop camera after success
                    setStep(3.5); // Show success screen
                } else {
                    setFaceVerified(false);
                    addToast(data.error || "Face Mismatch. Try Again.", 'error');
                    // Go back to step 2 after delay
                    setTimeout(() => setStep(2), 2000);
                }

            } catch (err) {
                console.error(err);
                addToast("Verification Failed: Network Error", 'error');
                setStep(2);
            }
        };

        if (step === 3 && isScanning) {
            // Wait 2s for user to align face, then capture
            captureTimer = setTimeout(captureFace, 2000);
        }

        return () => clearTimeout(captureTimer);
    }, [step, isScanning]);

    // Effect: Handle Step 3.5 (Verification Success) -> Step 4 (Payment)
    useEffect(() => {
        if (step === 3.5) {
            const timer = setTimeout(() => {
                setStep(4);
            }, 1500); // Show success message for 1.5s then move to payment
            return () => clearTimeout(timer);
        }
    }, [step]);

    // --- DISPENSE LOGIC ---
    const handleDispense = async () => {
        setDispensing(true);
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
                setTimeout(() => {
                    setStep(5);
                    setDispensing(false);
                }, 2000);
            } else {
                throw new Error("Validation Failed");
            }
        } catch (err) {
            addToast("Dispense Failed", 'error');
            setDispensing(false);
        }
    };

    const resetFlow = () => {
        setStep(1);
        setScannedData(null);
        setFaceVerified(false);
        setRationDetails({ rice: 0, dhal: 0, cost: 0, maxRice: 0, maxDhal: 0 });
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 flex flex-col items-center">

            {/* Header */}
            <div className="w-full max-w-6xl flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Smart PDS Dispenser
                    </h1>
                    <p className="text-xs text-slate-500 font-mono">
                        {currentUser?.shopLocation} | {currentUser?.name}
                    </p>
                </div>
                <button onClick={() => navigate('/history')} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl shadow-sm border border-indigo-50 hover:bg-indigo-50 transition-colors">
                    <Clock size={18} /> History
                </button>
            </div>

            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT: VISUAL / CAMERA */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 aspect-[4/5] relative">

                        {/* 1. QR SCANNER VIEW (Visible in Step 1 OR Step 3 OR if manually scanning) */}
                        {/* We use 'hidden' class instead of unmounting to keep videoRef stable if needed, but conditional mount is fine if we wait for it */}
                        {(step === 1 || step === 3 || isScanning) && (
                            <div className="relative w-full h-full bg-black">
                                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

                                <div className="absolute inset-0 border-[24px] border-white/10 rounded-3xl pointer-events-none"></div>
                                {!isScanning && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
                                        <button onClick={startScanner} className="px-8 py-4 bg-indigo-600 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                                            <Camera /> Start Scanner
                                        </button>
                                        <div className="mt-8 flex gap-2">
                                            <button onClick={() => processScan('RC-1001')} className="px-3 py-1 bg-white/20 rounded text-xs">Simulate RC-1001</button>
                                            <button onClick={() => processScan('RC-1003')} className="px-3 py-1 bg-white/20 rounded text-xs">Simulate RC-1003</button>
                                        </div>
                                    </div>
                                )}
                                {isScanning && (
                                    <>
                                        <button onClick={stopScanner} className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-red-500/80 text-white rounded-full text-sm backdrop-blur-sm">Stop Camera</button>
                                    </>
                                )}

                                {/* Error State */}
                                {scanError && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center z-10">
                                        <AlertTriangle size={48} className="text-red-500 mb-4" />
                                        <p className="font-bold text-lg mb-2 text-red-100">Camera Access Error</p>
                                        <p className="text-sm text-slate-400 mb-6">{scanError}</p>
                                        <button onClick={retryScanner} className="px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-slate-200">
                                            Retry Camera
                                        </button>
                                    </div>
                                )}

                                {/* Step 3: Face Verification Overlay */}
                                {step === 3 && isScanning && !scanError && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">

                                        {/* Viewfinder Container */}
                                        <div className="relative flex items-center justify-center">

                                            {/* 1. The Circle (Face Guide) */}
                                            <div className="w-64 h-64 rounded-full border-2 border-white/50 relative z-10 box-border shadow-[0_0_20px_rgba(0,0,0,0.5)]"></div>

                                            {/* Scanning Animation Line */}
                                            <div className="absolute w-full h-1 bg-indigo-400/80 top-0 animate-[scan_2s_ease-in-out_infinite] blur-sm"></div>
                                        </div>

                                        <h3 className="mt-12 text-2xl font-bold text-white shadow-md tracking-wide">VERIFYING FACE</h3>
                                        <p className="text-indigo-200 font-medium">Align your face within the circle</p>
                                    </div>
                                )}

                                {/* Step 3.5: Success Overlay */}
                                {step === 3.5 && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-600/90 text-white z-20 backdrop-blur-sm">
                                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce">
                                            <ShieldCheck size={64} className="text-emerald-600" />
                                        </div>
                                        <h3 className="text-3xl font-bold">Verified!</h3>
                                        <p className="text-emerald-100 mt-2">Proceeding to payment...</p>
                                    </div>
                                )}
                            </div>
                        )}



                        {/* 2. BENEFICIARY PHOTO VIEW (With Member Selection) */}
                        {step === 2 && scannedData && (
                            <div className="w-full h-full p-6 flex flex-col items-center bg-gradient-to-br from-indigo-50 to-white overflow-y-auto">
                                {/* SELECTED MEMBER PHOTO */}
                                <div className="w-48 h-48 rounded-full border-4 border-white shadow-xl overflow-hidden mb-4 shrink-0">
                                    {(() => {
                                        // Determine which image to show based on selection
                                        let displayImg = scannedData.image; // Default Head
                                        if (selectedMemberId !== 'HEAD') {
                                            const mem = scannedData.members.find(m => m._id === selectedMemberId);
                                            if (mem && mem.image) displayImg = mem.image;
                                        }

                                        return displayImg ? (
                                            <img
                                                src={displayImg.startsWith('data:') || displayImg.startsWith('http')
                                                    ? displayImg
                                                    : `${API_URL.replace('/api', '')}/${displayImg}`}
                                                className="w-full h-full object-cover"
                                                alt="Beneficiary"
                                            />
                                        ) : (
                                            <User className="w-full h-full p-8 text-slate-300 bg-slate-100" />
                                        );
                                    })()}
                                </div>

                                <h2 className="text-2xl font-bold text-slate-800 text-center">{scannedData.name}</h2>
                                <p className="text-slate-500 font-mono mb-2">{scannedData.card}</p>

                                {/* MEMBER SELECTION LIST */}
                                <div className="w-full mt-4 space-y-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Person Present</p>

                                    {/* HEAD OPTION */}
                                    <div
                                        onClick={() => setSelectedMemberId('HEAD')}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedMemberId === 'HEAD' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMemberId === 'HEAD' ? 'border-white' : 'border-slate-400'}`}>
                                            {selectedMemberId === 'HEAD' && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <span className="font-bold text-sm">Head: {scannedData.name}</span>
                                    </div>

                                    {/* FAMILY MEMBERS */}
                                    {scannedData.members && scannedData.members.map(member => (
                                        <div
                                            key={member._id}
                                            onClick={() => setSelectedMemberId(member._id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedMemberId === member._id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMemberId === member._id ? 'border-white' : 'border-slate-400'}`}>
                                                {selectedMemberId === member._id && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm">{member.name}</span>
                                                <span className={`text-[10px] ${selectedMemberId === member._id ? 'text-indigo-200' : 'text-slate-500'}`}>{member.relation} ({member.age}y)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {scannedData.assignmentWarning && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg flex gap-2 items-center w-full justify-center">
                                        <AlertTriangle size={16} /> {scannedData.assignmentWarning}
                                    </div>
                                )}
                            </div>
                        )}



                        {/* 5. DISPENSE SUCCESS */}
                        {step === 5 && (
                            <div className="w-full h-full bg-emerald-600 flex flex-col items-center justify-center text-white p-8 text-center">
                                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                    <ShoppingBag size={64} />
                                </div>
                                <h2 className="text-3xl font-bold mb-2">Dispensed!</h2>
                                <p className="opacity-90 mb-8">Please collect the ration items from the dispenser tray.</p>
                                <button onClick={resetFlow} className="px-8 py-3 bg-white text-emerald-700 rounded-xl font-bold shadow-lg hover:bg-emerald-50">
                                    Next Customer
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: CONTROLS & INFO */}
                <div className="lg:col-span-7 flex flex-col gap-6">

                    {/* Step 2: Ration Selection */}
                    {step === 2 && scannedData && (
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <FileText size={24} className="text-indigo-600" /> Ration Entitlement
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {/* Rice Card */}
                                <div className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedRations.rice ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200'}`}
                                    onClick={() => setSelectedRations(p => ({ ...p, rice: !p.rice }))}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-slate-700">Rice (Raw)</span>
                                        {selectedRations.rice && <CheckCircle size={20} className="text-indigo-600" />}
                                    </div>
                                    <div className="text-3xl font-bold text-indigo-900 mb-1">{selectedRations.rice ? (rationDetails.maxRice || 0).toFixed(2) : 0} <span className="text-sm font-normal text-slate-500">kg</span></div>
                                    <div className="text-xs text-slate-500">RATE: ₹100/kg</div>
                                </div>

                                {/* Dhal Card */}
                                <div className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedRations.dhal ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-200'}`}
                                    onClick={() => setSelectedRations(p => ({ ...p, dhal: !p.dhal }))}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-slate-700">Toor Dhal</span>
                                        {selectedRations.dhal && <CheckCircle size={20} className="text-orange-600" />}
                                    </div>
                                    <div className="text-3xl font-bold text-indigo-900 mb-1">{selectedRations.dhal ? (rationDetails.maxDhal || 0).toFixed(2) : 0} <span className="text-sm font-normal text-slate-500">kg</span></div>
                                    <div className="text-xs text-slate-500">RATE: ₹200/kg</div>
                                </div>
                            </div>

                            <div className="bg-slate-900 text-white p-6 rounded-2xl flex justify-between items-center shadow-xl">
                                <div>
                                    <p className="text-slate-400 text-sm mb-1">Total Payable Amount</p>
                                    <p className="text-3xl font-bold">₹ {(rationDetails.cost || 0).toFixed(2)}</p>
                                </div>
                                <button onClick={startFaceAuth} className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2">
                                    <ShieldCheck size={20} /> Verify & Pay
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Payment */}
                    {step === 4 && (
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Banknote size={24} className="text-emerald-600" /> Payment Interface
                            </h3>

                            <div className="flex gap-4 mb-8">
                                <button
                                    onClick={() => setPaymentMode('Cash')}
                                    className={`flex-1 py-4 rounded-2xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${paymentMode === 'Cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}
                                >
                                    <Banknote size={32} /> Cash Payment
                                </button>
                                <button
                                    onClick={() => setPaymentMode('UPI')}
                                    className={`flex-1 py-4 rounded-2xl border-2 font-bold flex flex-col items-center gap-2 transition-all ${paymentMode === 'UPI' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}
                                >
                                    <Zap size={32} /> UPI / QR
                                </button>
                            </div>

                            {paymentMode === 'Cash' ? (
                                <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-200 mb-8">
                                    <p className="text-slate-500 mb-2">Collect Cash from Beneficiary</p>
                                    <p className="text-5xl font-bold text-slate-800">₹ {rationDetails.cost}</p>
                                </div>
                            ) : (
                                <div className="text-center p-8 bg-blue-50 rounded-2xl border border-blue-100 mb-8 flex flex-col items-center">
                                    <div className="w-48 h-48 bg-white p-2 rounded-xl shadow-sm mb-4">
                                        {/* Placeholder QR */}
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=jeys.rajasekar@okaxis&pn=SmartPDS&am=${rationDetails.cost}`} className="w-full h-full" />
                                    </div>
                                    <p className="font-bold text-blue-800">Scan to Pay ₹ {rationDetails.cost}</p>
                                </div>
                            )}

                            <button
                                onClick={handleDispense}
                                disabled={dispensing}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {dispensing ? <RefreshCw className="animate-spin" /> : <ShoppingBag />}
                                {dispensing ? 'Processing Dispense...' : 'Confirm Payment & Dispense'}
                            </button>
                        </div>
                    )}

                    {/* Pending State for Step 1 */}
                    {step === 1 && (
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-full flex flex-col items-center justify-center text-center opacity-60">
                            <Camera size={48} className="text-slate-300 mb-4" />
                            <p className="text-slate-400 font-medium">Waiting for Beneficiary...</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default ScanDispense;
