import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Lock, ArrowRight, Eye, EyeOff, Camera, CheckCircle, AlertTriangle } from 'lucide-react';


const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Face Auth State
    const [step, setStep] = useState(1); // 1: Creds, 2: Face
    const videoRef = React.useRef(null);
    const [scanError, setScanError] = useState('');

    const handleCredentialsLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Success - Move to Step 2
                setStep(2);
                setTimeout(startCamera, 100);
            } else {
                throw new Error(data.message || "Invalid credentials");
            }

        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to login. Check server.");
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            setScanError("Camera Access Failed: " + err.message);
        }
    };

    const handleFaceVerify = async () => {
        if (!videoRef.current) return;
        setLoading(true);

        // Capture
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
        const liveImage = canvas.toDataURL("image/jpeg");

        try {
            const response = await fetch('http://localhost:5000/api/auth/verify-employee-face', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, liveImage })
            });

            const data = await response.json();

            if (data.success) {
                // Final Success
                const confidencePercent = (data.confidence * 100).toFixed(1);
                setError(`Verified! Confidence: ${confidencePercent}%`);

                const loginRes = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const loginData = await loginRes.json();

                localStorage.setItem('user', JSON.stringify(loginData.user));

                // Stop Camera
                const stream = videoRef.current.srcObject;
                if (stream) stream.getTracks().forEach(t => t.stop());

                // Delay navigation to show success message
                setTimeout(() => {
                    if (loginData.user.role === 'manager') {
                        navigate('/admin');
                    } else {
                        navigate('/home');
                    }
                }, 1500);

            } else {
                const confidencePercent = data.confidence ? (data.confidence * 100).toFixed(1) : 0;
                setError(data.message || `Face Mismatch (${confidencePercent}%). Try Again.`);
                setLoading(false);
            }

        } catch (err) {
            setError("Verification Error");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-4 relative overflow-hidden">

            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Smart PDS</h1>
                    <p className="text-indigo-200">Public Distribution System</p>
                </div>

                {step === 1 && (
                    <form onSubmit={handleCredentialsLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 text-indigo-300" size={20} />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-light"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 text-indigo-300" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-12 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-light"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3.5 text-indigo-300 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                        <button
                            id="btn-login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all group bg-gradient-to-r from-indigo-500 to-cyan-500 hover:to-cyan-400 text-white"
                        >
                            {loading ? 'Verifying...' : 'Next Step'}
                            {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <div className="space-y-6 text-center">
                        <div className="bg-black/50 rounded-2xl overflow-hidden aspect-square relative border border-white/10">
                            <video ref={videoRef} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
                            {scanError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-400 p-4">
                                    <AlertTriangle className="mb-2" />
                                    <p>{scanError}</p>
                                </div>
                            )}
                        </div>
                        <p className="text-white text-sm">Align face to verify identity</p>

                        {error && (
                            <p className={`text-sm text-center animate-pulse ${error.includes('Verified') ? 'text-green-400 font-bold text-lg' : 'text-red-400'}`}>
                                {error.includes('Verified') ? <span className="flex items-center justify-center gap-2"><CheckCircle /> {error}</span> : error}
                            </p>
                        )}

                        <button
                            id="btn-verify-face-login"
                            onClick={handleFaceVerify}
                            disabled={loading || scanError}
                            className="w-full py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all group bg-gradient-to-r from-green-500 to-emerald-500 hover:to-emerald-400 text-white disabled:opacity-50"
                        >
                            {loading ? 'Verifying Face...' : 'Verify Login'}
                            {!loading && <Shield size={20} />}
                        </button>

                        <button onClick={() => { setStep(1); setError(''); }} className="text-xs text-indigo-300 hover:text-white mt-2">
                            Back to Credentials
                        </button>
                    </div>
                )}

                <p className="text-center text-indigo-300/60 text-xs mt-6">
                    © 2026 Smart PDS Project. Secure Login.
                </p>
            </motion.div>
        </div >
    );
};

export default Login;
