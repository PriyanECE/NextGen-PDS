import React, { useEffect, useRef } from 'react';

const VoiceVisualizer = ({ isListening }) => {
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (isListening) {
            startVisualizer();
        } else {
            stopVisualizer();
        }
        return () => stopVisualizer();
    }, [isListening]);

    const startVisualizer = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.fftSize = 256;

            draw();
        } catch (err) {
            console.error("Visualizer Error:", err);
        }
    };

    const stopVisualizer = () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) audioContextRef.current.close();
    };

    const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Draw Google-like blobs
        // We utilize low frequency data for volume/scale
        const volume = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const scale = 1 + (volume / 256) * 1.5; // Scale factor

        // Color Palette
        const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853']; // Google Colors

        colors.forEach((color, i) => {
            ctx.beginPath();
            // Create orbiting blobs based on volume
            const angle = (Date.now() / 1000) * (i + 1) + (i * Math.PI / 2);
            const orbitRadius = 15 * scale;
            const x = centerX + Math.cos(angle) * orbitRadius;
            const y = centerY + Math.sin(angle) * orbitRadius;

            ctx.fillStyle = color;
            ctx.arc(x, y, 8 * scale, 0, Math.PI * 2);
            ctx.fill();
        });

        animationRef.current = requestAnimationFrame(draw);
    };

    return <canvas ref={canvasRef} width={200} height={100} className="w-full h-full" />;
};

export default VoiceVisualizer;
