import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Shield, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import API_URL from '../config/api';

const Login = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Credentials, 2: Face Verify
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Face Auth State
    const videoRef = useRef(null);
    const [scanError, setScanError] = useState('');

    const handleCredentialsLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                setStep(2);
                setTimeout(startCamera, 100);
            } else {
                throw new Error(data.message || "Invalid credentials");
            }
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            setScanError("Camera access denied. Please allow camera permissions.");
        }
    };

    const handleFaceVerify = async () => {
        if (!videoRef.current) return;
        setLoading(true);

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
        const liveImage = canvas.toDataURL("image/jpeg");

        try {
            const response = await fetch(`${API_URL}/api/auth/verify-employee-face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, liveImage })
            });

            const data = await response.json();

            if (data.success) {
                // Perform final login to get token
                const loginRes = await fetch(`${API_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const loginData = await loginRes.json();

                localStorage.setItem('user', JSON.stringify(loginData.user));

                // Cleanup camera
                const stream = videoRef.current.srcObject;
                if (stream) stream.getTracks().forEach(t => t.stop());

                // Role-based Redirect
                navigate(loginData.user.role === 'manager' ? '/admin' : '/home');
            } else {
                throw new Error(data.message || `Face mismatch (${(data.confidence * 100).toFixed(0)}%)`);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">

            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-brand-500/30">
                            <Shield className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">Welcome Back</h1>
                        <p className="text-slate-400 text-sm">Sign in to Smart PDS System</p>
                    </div>

                    {step === 1 && (
                        <form onSubmit={handleCredentialsLogin} className="space-y-5">
                            <Input
                                icon={User}
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-brand-500/50"
                            />

                            <div className="relative">
                                <Input
                                    icon={Lock}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-brand-500/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-200 text-sm">
                                    <AlertTriangle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 py-3.5 rounded-xl font-bold text-base"
                                isLoading={loading}
                            >
                                Continue <ArrowRight size={18} className="ml-2" />
                            </Button>
                        </form>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                                <video ref={videoRef} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
                                {scanError && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-400 p-4 text-center">
                                        <p>{scanError}</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 border-[3px] border-brand-500/30 rounded-2xl pointer-events-none" />
                            </div>

                            <div className="text-center">
                                <p className="text-white font-medium mb-1">Face Verification Required</p>
                                <p className="text-slate-400 text-xs">Please look directly at the camera</p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-200 text-sm justify-center">
                                    <AlertTriangle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <Button
                                onClick={handleFaceVerify}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 py-3.5"
                                isLoading={loading}
                                disabled={!!scanError}
                                id="btn-verify-face-login"
                            >
                                Verify Identity
                            </Button>

                            <button
                                onClick={() => setStep(1)}
                                className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Back to Login
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-center text-slate-600 text-xs mt-8">
                    Smart PDS System v2.0 • Secure Access
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
