import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, X, MoreHorizontal } from 'lucide-react';
import { useVoiceCommands } from '../context/VoiceCommandContext';
import VoiceVisualizer from './VoiceVisualizer';
import API_URL from '../config/api';

const VoiceChatbot = () => {
  // State
  const [isAwake, setIsAwake] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [botMessage, setBotMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs
  const navigate = useNavigate();
  const location = useLocation();
  const silenceTimer = useRef(null);
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const [selectedLang, setSelectedLang] = useState('en-IN');

  // --- 1. PREMIUM TTS ENGINE (BACKEND NEURAL) ---
  const speak = async (text, lang = 'en-IN') => {
    if (!text) return;

    // Stop any playing audio
    if (window.currentAudio) {
      window.currentAudio.pause();
      window.currentAudio = null;
    }

    setIsSpeaking(true);
    setBotMessage(text);

    // CRITICAL: Stop listening to prevent echo loop
    SpeechRecognition.stopListening();

    try {
      // Fetch audio from backend (Edge TTS)
      const response = await fetch(`${API_URL}/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`);
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      window.currentAudio = audio; // Track globally to allow stopping

      audio.onended = () => {
        setIsSpeaking(false);
        setBotMessage('');
        URL.revokeObjectURL(audioUrl); // Cleanup
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        console.error("Audio Playback Error");
      };

      await audio.play();
    } catch (err) {
      console.error("TTS Fetch Error:", err);
      setIsSpeaking(false);
    }
  };

  // --- 2. ACTIVATION & WAKE WORD ---
  // --- PREITCH STARTUP AUDIO ---
  useEffect(() => {
    // Pre-load the "How can I help you?" audio for English to make startup instant
    const preloadAudio = new Audio(`${API_URL}/api/tts?text=${encodeURIComponent("How can I help you?")}&lang=en-IN`);
    preloadAudio.load();
  }, []);

  useEffect(() => {
    if (!transcript) return;
    const msg = transcript.toLowerCase();

    // Universal Wake Words (More Permissive)
    const wakeWords = ['hey', 'hello', 'hi', 'wake', 'start', 'smart', 'pds', 'listen', 'ok'];
    const isWakeWord = wakeWords.some(word => msg.includes(word));

    if (!isAwake && isWakeWord) {
      console.log("Wake Word Detected:", msg);
      activate();
    }

    // Stop Command
    if (isAwake && (msg.includes('stop') || msg.includes('cancel') || msg.includes('exit') || msg.includes('terminate') || msg.includes('close'))) {
      deactivate();
    }

  }, [transcript, isAwake]);

  const activate = () => {
    setIsAwake(true);
    resetTranscript();
    speak("How can I help you?", selectedLang);
  };

  const deactivate = () => {
    setIsAwake(false);
    resetTranscript();

    if (window.currentAudio) {
      window.currentAudio.pause();
      window.currentAudio = null;
    }
    setIsSpeaking(false);
  };

  // --- 3. INTELLIGENT PROCESSING (NLU) ---
  // We listen for silence (2 seconds) after user speaks to trigger backend
  useEffect(() => {
    if (!isAwake || isSpeaking || isProcessing || !transcript) return;

    // Clear existing timer
    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    // Set new timer (Debounce)
    silenceTimer.current = setTimeout(async () => {
      // Only process if sufficient length (avoid noise)
      if (transcript.trim().length > 3) {
        // STOP LISTENING IMMEDIATELY to prevent echo
        SpeechRecognition.stopListening();
        await processCommand(transcript);
      }
    }, 800); // Reduced to 0.8s for faster response

    return () => clearTimeout(silenceTimer.current);
  }, [transcript, isAwake, isSpeaking, isProcessing]);


  const processCommand = async (command) => {
    console.log("Processing:", command);
    setIsProcessing(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: command,
          language: selectedLang,
          context: {
            page: location.pathname,
            role: JSON.parse(localStorage.getItem('user') || '{}').role || 'guest'
          }
        })
      });

      const data = await res.json();

      // 1. Speak Reply
      if (data.reply) {
        // Prevention of Error Loop: Don't speak if it's the generic error message and we just spoke one
        const isErrorMsg = data.reply.includes("AI service is not available") || data.reply.includes("not understand");
        if (!isErrorMsg || !isSpeaking) {
          speak(data.reply, selectedLang);
        }
      }

      // 2. Execute Action
      if (data.action && data.action.type !== 'NONE') {
        console.log("AI Action:", data.action);

        if (data.action.type === 'NAV') {
          navigate(data.action.target);
        }
        else if (data.action.type === 'CLICK') {
          const el = document.getElementById(data.action.target);
          if (el) el.click();
          else console.warn("Element not found:", data.action.target);
        }
        else if (data.action.type === 'SET_LANG') {
          const newLang = data.action.target;
          if (['en-IN', 'ta-IN', 'hi-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN'].includes(newLang)) {
            setSelectedLang(newLang);
            // Optionally speak confirmation in new language if the reply didn't already
          }
        }
      }

      resetTranscript();

    } catch (err) {
      console.error(err);
      // Reduce verify loop: Only speak error if not already speaking
      if (!isSpeaking) {
        speak("I'm having trouble connecting.", selectedLang);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 4. MIC MANAGEMENT ---
  useEffect(() => {
    const restartMic = () => {
      if (isSpeaking) return; // Don't interrupt TTS

      // Stop first to apply new config (Language/Mode)
      SpeechRecognition.stopListening();

      setTimeout(() => {
        if (isAwake) {
          console.log("Mic Active: Listening in", selectedLang);
          SpeechRecognition.startListening({ continuous: true, language: selectedLang });
        } else {
          console.log("Mic Standby: Listening for Wake Word (en-IN)");
          SpeechRecognition.startListening({ continuous: true, language: 'en-IN' });
        }
      }, 100); // Small delay to allow stop to process
    };

    restartMic();
  }, [isAwake, isSpeaking, selectedLang]);

  if (!browserSupportsSpeechRecognition) return null;

  return (
    <>
      {/* 1. Floating Trigger Button (Always Visible) */}
      {!isAwake && (
        <button
          onClick={activate}
          className="fixed bottom-6 right-6 w-16 h-16 bg-white rounded-full shadow-2xl border border-slate-100 flex items-center justify-center z-50 hover:scale-110 transition-transform group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full opacity-0 group-hover:opacity-10 transition-opacity" />
          <Mic className="text-slate-700 group-hover:text-indigo-600 transition-colors" />
        </button>
      )}

      {/* 2. Full Overlay Mode (Google Assistant Style) */}
      {isAwake && (
        <div className="fixed inset-x-0 bottom-0 top-auto z-50 flex flex-col items-center justify-end pointer-events-none">

          {/* Glass Panel */}
          <div className="bg-white/90 backdrop-blur-xl w-full md:w-[600px] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-8 pointer-events-auto transition-all duration-500 ease-out transform translate-y-0 pb-12 border-t border-white/50">

            {/* Header Controls */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Smart Assistant</span>
              </div>
              <button onClick={deactivate} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Visualizer & Status */}
            <div className="flex flex-col items-center gap-6">

              {/* Pro Visualizer */}
              <div className="w-full h-24 relative flex items-center justify-center">
                {isProcessing ? (
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce delay-0" />
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce delay-100" />
                    <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce delay-200" />
                  </div>
                ) : isSpeaking ? (
                  <div className="w-full text-center">
                    <p className="text-xl font-medium text-slate-800 animate-pulse">{botMessage}</p>
                  </div>
                ) : (
                  <VoiceVisualizer isListening={true} />
                )}
              </div>

              {/* Transcript Display */}
              <div className="text-center min-h-[40px]">
                <p className="text-2xl font-light text-slate-600 leading-relaxed">
                  {transcript || (isSpeaking ? "" : "Listening...")}
                </p>
              </div>

              {/* Language Selector (Subtle) */}
              <div className="flex gap-2 mt-4">
                {['en-IN', 'ta-IN', 'hi-IN'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${selectedLang === lang ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {lang === 'en-IN' ? 'English' : lang === 'ta-IN' ? 'தமிழ்' : 'हिंदी'}
                  </button>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceChatbot;
