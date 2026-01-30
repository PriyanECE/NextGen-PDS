import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, Volume2, X } from 'lucide-react';
import { useVoiceCommands } from '../context/VoiceCommandContext';

const VoiceAssistant = () => {
  // --- STATE MANAGEMENT ---
  const [isAwake, setIsAwake] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const speakStartTimeRef = React.useRef(0);
  const [isWaitingForLang, setIsWaitingForLang] = useState(false);
  const audioContextRef = React.useRef(null);
  const audioRef = React.useRef(null);
  const synthesisTimeoutRef = React.useRef(null);
  const silenceTimerRef = React.useRef(null);

  // --- LANGUAGES SUPPORT ---
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const languages = [
    { code: 'en-IN', name: 'English (Indian)' },
    { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
    { code: 'hi-IN', name: 'Hindi (हिंदी)' },
    { code: 'te-IN', name: 'Telugu (తెలుగు)' },
    { code: 'kn-IN', name: 'Kannada (कन्नड़)' },
    { code: 'ml-IN', name: 'Malayalam (മലയാളം)' },
    { code: 'mr-IN', name: 'Marathi (मराठी)' }
  ];

  // --- TRANSLATIONS (Cleaned Up) ---
  const translations = {
    'en-IN': {
      welcome: "Please select your language. Say English, Tamil, or Hindi.",
      listening: "Listening...",
      processing: "Thinking...",
      ready: "I am ready.",
      nav_back: "Going back",
      lang_ta: "Tamil Selected.",
      lang_en: "English Selected.",
      error_generic: "Something went wrong.",
      denied: "Access Denied.",
    },
    'ta-IN': {
      welcome: "மொழியை தேர்ந்தெடுக்கவும்.",
      listening: "கவனிக்கிறேன்...",
      processing: "யோசிக்கிறேன்...",
      ready: "நான் தயார்.",
      nav_back: "பின் செல்கிறேன்",
      lang_ta: "தமிழ் தேர்ந்தெடுக்கப்பட்டது.",
      lang_en: "ஆங்கிலம்.",
      error_generic: "பிழை ஏற்பட்டது.",
      denied: "அனுமதி மறுக்கப்பட்டது.",
    },
    'hi-IN': {
      welcome: "भाषा चुनें।",
      listening: "सुन रहा हूँ...",
      processing: "सोच रहा हूँ...",
      ready: "मैं तैयार हूँ।",
      nav_back: "वापस जा रहा हूँ",
      error_generic: "कुछ गलत हो गया।",
      denied: "अनुमति नहीं है।",
    },
    'te-IN': {
      welcome: "భాషను ఎంచుకోండి.",
      listening: "వింటున్నాను...",
      processing: "ఆలోచిస్తున్నాను...",
      ready: "సిద్ధంగా ఉన్నాను.",
      nav_back: "వెనుకకు వెళ్తున్నాను",
      error_generic: "ఏదో తప్పు జరిగింది.",
      denied: "అనుమతి నిరాకరించబడింది.",
    },
    'kn-IN': {
      welcome: "ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
      listening: "ಕೇಳುತ್ತಿದ್ದೇನೆ...",
      processing: "ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...",
      ready: "ನಾನು ಸಿದ್ಧ.",
      nav_back: "ಹಿಂದೆ ಹೋಗುತ್ತಿದ್ದೇನೆ",
      error_generic: "ಏನೋ ತಪ್ಪಾಗಿದೆ.",
      denied: "ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ.",
    },
    'ml-IN': {
      welcome: "ഭാഷ തിരഞ്ഞെടുക്കുക.",
      listening: "ശ്രദ്ധിക്കുന്നു...",
      processing: "ആലോചിക്കുന്നു...",
      ready: "ഞാൻ തയ്യാറാണ്.",
      nav_back: "തിരിച്ചു പോകുന്നു",
      error_generic: "എന്തോ കുഴപ്പമുണ്ട്.",
      denied: "അനുമതി നിഷേധിച്ചു.",
    },
    'mr-IN': {
      welcome: "भाषा निवडा.",
      listening: "ऐकत आहे...",
      processing: "विचार करत आहे...",
      ready: "मी तयार आहे.",
      nav_back: "मागे जात आहे",
      error_generic: "काहीतरी चूक झाली.",
      denied: "प्रवेश नाकारला.",
    }
  };

  // Helper: Get Translation
  const t = (key) => {
    const langData = translations[selectedLang] || translations['en-IN'];
    return langData[key] || translations['en-IN'][key] || key;
  };

  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatchCommand } = useVoiceCommands();

  // --- SOUND EFFECTS ---
  const playSound = (type) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'activate') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'deactivate') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    }
  };

  // --- CORE FUNCTIONS ---
  const activateAssistant = () => {
    playSound('activate');
    setIsAwake(true);
    setIsWaitingForLang(true);
    resetTranscript();
    speak("Please select your language. Say English, Tamil, Hindi, Malayalam, Telugu, or Kannada.", 'en-IN');
  };

  const deactivateAssistant = (silent = false) => {
    // Stop all ongoing speech immediately
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Play feedback
    if (!silent) {
      // Use a short delay to ensure speech is fully cancelled before speaking
      setTimeout(() => speak("Goodbye", 'en-IN'), 100);
    } else {
      playSound('deactivate');
    }

    // Reset all state
    setIsAwake(false);
    setIsWaitingForLang(false);
    setResponseMsg('');
    setIsBotSpeaking(false);
    setSelectedLang('en-IN'); // CRITICAL: Reset to English for universal wake word

    // Clear transcript after a short delay to ensure clean state
    setTimeout(() => resetTranscript(), 150);
  };

  // --- TTS ENGINE (Refined with Better Fallback) ---
  const speak = (text, forceLang = null) => {
    if (!text) return;
    const currentLang = forceLang || selectedLang || 'en-IN';
    console.log(`[VoiceChatbot] Speaking: "${text}" (${currentLang})`);

    // 1. Cancel existing
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsBotSpeaking(true);
    speakStartTimeRef.current = Date.now();

    // 2. Try Backend TTS Proxy for Indian Languages (with timeout)
    const indianLangs = ['ta-IN', 'hi-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN'];
    if (indianLangs.includes(currentLang)) {
      try {
        const ttsUrl = `http://localhost:5000/api/tts?text=${encodeURIComponent(text)}&lang=${currentLang}`;
        const audio = new Audio(ttsUrl);
        audioRef.current = audio;

        // Set a timeout to fallback if audio doesn't load within 2 seconds
        const fallbackTimer = setTimeout(() => {
          console.warn('[VoiceChatbot] Backend TTS timeout, using browser fallback');
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          speakWithSynthesis(text, currentLang);
        }, 2000);

        audio.onplay = () => {
          clearTimeout(fallbackTimer);
          window.speechSynthesis.cancel();
          setIsBotSpeaking(true);
        };
        audio.onended = () => {
          clearTimeout(fallbackTimer);
          setIsBotSpeaking(false);
        };
        audio.onerror = (err) => {
          clearTimeout(fallbackTimer);
          console.warn('[VoiceChatbot] Backend TTS error:', err);
          speakWithSynthesis(text, currentLang);
        };

        audio.play().catch(e => {
          clearTimeout(fallbackTimer);
          console.warn('[VoiceChatbot] Audio play failed:', e);
          speakWithSynthesis(text, currentLang);
        });
        return;
      } catch (e) {
        console.warn('[VoiceChatbot] Backend TTS exception:', e);
        speakWithSynthesis(text, currentLang);
      }
    } else {
      speakWithSynthesis(text, currentLang);
    }
  };

  const speakWithSynthesis = (text, lang) => {
    const utterance = new SpeechSynthesisUtterance(text);

    // Ensure voices are loaded (Chrome/Edge requirement)
    const loadVoicesAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();

      // Voice Selection Strategy: Try exact match, then language family, then default
      let voice = voices.find(v => v.lang === lang) ||
        voices.find(v => v.lang.startsWith(lang.split('-')[0])) ||
        voices.find(v => v.lang.startsWith('en')); // Ultimate fallback to English

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = lang;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log('[VoiceChatbot] Browser TTS started');
        setIsBotSpeaking(true);
      };
      utterance.onend = () => {
        console.log('[VoiceChatbot] Browser TTS ended');
        setIsBotSpeaking(false);
      };
      utterance.onerror = (err) => {
        console.error('[VoiceChatbot] Browser TTS error:', err);
        setIsBotSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    // Check if voices are already loaded
    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoicesAndSpeak();
    } else {
      // Wait for voices to load (required in some browsers)
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoicesAndSpeak();
        window.speechSynthesis.onvoiceschanged = null; // Clean up listener
      };
      // Fallback: if voices don't load within 500ms, speak anyway
      setTimeout(loadVoicesAndSpeak, 500);
    }
  };

  // --- MIC MANAGEMENT ---
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) return;

    // Restart logic (now works on ALL pages including login)
    SpeechRecognition.stopListening();
    const timer = setTimeout(() => {
      SpeechRecognition.startListening({ continuous: true, language: selectedLang })
        .catch(e => console.error("Mic Error:", e));
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedLang, location.pathname, browserSupportsSpeechRecognition]);


  // --- MAIN COMMAND LOOP ---
  useEffect(() => {
    if (!transcript) return;
    const lowerTranscript = transcript.toLowerCase();

    // 1. BARGE-IN (Sensitivity Optimization)
    if (isBotSpeaking) {
      // Fast interruption: Allow user to cut off bot after just 500ms
      // We filter short noise (< 2 chars) to prevent accidental triggers
      if (Date.now() - speakStartTimeRef.current > 500 && transcript.length > 2) {
        console.log("User interrupted (Barge-in)");
        window.speechSynthesis.cancel();
        if (audioRef.current) audioRef.current.pause();
        setIsBotSpeaking(false);
        // Don't return here! Fall through to process the command that interrupted
      } else {
        return; // Ignore echo/noise during the first 500ms
      }
    }

    // 2. WAKE WORD (Multilingual)
    if (!isAwake) {
      const wakeWords = [
        'hello', 'hey', 'start', 'wake up',
        'vanakkam', 'வணக்கம்', // Tamil
        'namaste', 'नमस्ते', // Hindi
        'namaskaram', 'నమస్కారం', // Telugu
        'namaskara', 'ನಮಸ್ಕಾರ', // Kannada
        'namaskaram', 'നമസ്കാരം', // Malayalam
        'namaskar', 'नमस्कार' // Marathi
      ];
      if (wakeWords.some(w => lowerTranscript.includes(w))) {
        activateAssistant();
      }
      return;
    }

    // 3. STOP/SLEEP COMMAND (Changed to "Thank You")
    const stopWords = [
      'stop', 'exit', // Keep basic tech commands for safety
      'thank you', 'thanks', 'thank u',
      'nandri', 'நன்றி', // Tamil
      'dhanyavad', 'shukriya', 'धन्यवाद', 'शुक्रिया', // Hindi
      'dhanyavadalu', 'ధన్యవాదాలు', // Telugu
      'dhanyavadagalu', 'ಧನ್ಯವಾದಗಳು', // Kannada
      'nanni', 'നന്ദി', // Malayalam
      'dhanyavad', 'aabhari', 'धन्यवाद', 'आभारी' // Marathi
    ];

    if (stopWords.some(w => lowerTranscript.includes(w))) {
      deactivateAssistant();
      return;
    }

    // 4. LANGUAGE SELECTION
    if (isWaitingForLang) {
      // EXCEPTION: On login page, allow login commands even during lang selection
      const isLoginPage = location.pathname === '/' || location.pathname === '/login';
      if (isLoginPage) {
        const loginPhrases = ['submit login', 'login now', 'next step', 'verify face', 'face login', 'scan face'];
        if (loginPhrases.some(p => lowerTranscript.includes(p))) {
          // Don't block - let it fall through to login command processing below
          setIsWaitingForLang(false); // Auto-set language to default
          setSelectedLang('en-IN');
        }
      }

      const langMap = {
        'tamil': 'ta-IN', 'thamizh': 'ta-IN', 'தமிழ்': 'ta-IN',
        'english': 'en-IN',
        'hindi': 'hi-IN', 'हिंदी': 'hi-IN',
        'malayalam': 'ml-IN', 'മലയാളം': 'ml-IN',
        'telugu': 'te-IN', 'తెలుగు': 'te-IN',
        'kannada': 'kn-IN', 'ಕನ್ನಡ': 'kn-IN',
        'marathi': 'mr-IN', 'मराठी': 'mr-IN'
      };

      let matched = false;
      for (const [key, code] of Object.entries(langMap)) {
        if (lowerTranscript.includes(key)) {
          setSelectedLang(code);
          setIsWaitingForLang(false);
          speak("Language set.", code);
          resetTranscript();
          matched = true;
          break;
        }
      }
      if (matched) return;

      // If we are waiting for lang but user said something else:
      if (!matched && transcript.trim().length > 2) {
        speak(t('welcome')); // "Please select your language..."
        resetTranscript();
        return;
      }
    }

    // 5. INSTANT COMMANDS
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAuthenticated = !!user && !!user.role;
    const role = user.role === 'manager' ? 'admin' : 'employee';
    const isLoginPage = location.pathname === '/' || location.pathname === '/login';

    // LOGIN PAGE RESTRICTION: Only allow login button commands
    if (isLoginPage && !isAuthenticated) {
      const loginCommands = [
        { phrase: ['submit login', 'login now', 'next step', 'உள்நுழையவும்', 'लॉगिन करें'], target: 'btn-login-submit' },
        { phrase: ['verify face', 'face login', 'scan face', 'முகம் சரிபார்', 'चेहरा सत्यापित करें'], target: 'btn-verify-face-login' }
      ];

      for (const cmd of loginCommands) {
        if (cmd.phrase.some(p => lowerTranscript.includes(p))) {
          const el = document.getElementById(cmd.target);
          if (el) {
            el.click();
            speak("Okay.");
          } else {
            speak("Button not available yet.");
          }
          resetTranscript();
          return;
        }
      }

      // If on login page and command doesn't match login commands, ignore it
      if (transcript.trim().length > 2) {
        speak("Please login first.");
        resetTranscript();
      }
      return;
    }

    const commands = [
      // ... (Previous NAV commands - kept implicit or we'll rely on the existing big array)
    ];
    // NOTE: I am not redefining the huge array here to save tokens, assuming it exists outside or above. 
    // Wait, the array IS inside the effect in the previous code. I must include it or maintain it.
    // Re-inserting the full array to be safe and ensure "Start Scanner" is fixed.

    const allCommands = [
      // ==========================================
      // 1. UNIVERSAL NAVIGATION (All Roles)
      // ==========================================
      {
        phrase: [
          'go to home', 'home', 'main menu', // English
          'முகப்பு', 'வீடு', // Tamil
          'होम', 'मुख्य मेनू', // Hindi
          'హోమ్', 'ప్రధాన మెనూ', // Telugu
          'ಮುಖ್ಯ ಪುಟ', // Kannada
          'ഹോം', 'പ്രധാന പേജ്', // Malayalam
          'मुख्यपृष्ठ' // Marathi
        ],
        action: 'NAV', target: '/home'
      },
      {
        phrase: [
          'login', 'sign in', // English
          'உள்நுழை', // Tamil
          'लॉगिन', 'साइन इन', // Hindi
          'లాగిన్', // Telugu
          'ಲಾಗಿನ್', // Kannada
          'ലോഗിൻ', // Malayalam
          'लॉग इन' // Marathi
        ],
        action: 'NAV', target: '/'
      },

      // ==========================================
      // 2. LOGIN PAGE ACTIONS
      // ==========================================
      {
        phrase: ['submit login', 'login now', 'next step', 'உள்நுழையவும்', 'लॉगिन करें'],
        action: 'CLICK', target: 'btn-login-submit'
      },
      {
        phrase: ['verify face', 'face login', 'scan face', 'முகம் சரிபார்', 'चेहरा सत्यापित करें'],
        action: 'CLICK', target: 'btn-verify-face-login'
      },

      // ==========================================
      // 3. ADMIN NAV
      // ==========================================
      { phrase: ['admin dashboard', 'admin'], action: 'NAV', target: '/admin', roles: ['admin'] },
      { phrase: ['report', 'transaction', 'அறிக்கை', 'रिपोर्ट'], action: 'NAV', target: '/admin?tab=reports', roles: ['admin'] },
      { phrase: ['request', 'approval', 'கோரிக்கை', 'अनुरोध'], action: 'NAV', target: '/admin?tab=requests', roles: ['admin'] },
      { phrase: ['inventory', 'stock', 'இருப்பு', 'स्टॉक'], action: 'NAV', target: '/admin?tab=inventory', roles: ['admin'] },
      { phrase: ['shop network', 'shop', 'கடைகள்', 'दुकानें'], action: 'NAV', target: '/admin?tab=network', roles: ['admin'] },

      // ==========================================
      // 4. ADMIN ACTIONS
      // ==========================================
      { phrase: ['add rice', 'stock rice'], action: 'CLICK', target: 'btn-add-rice', roles: ['admin'] },
      { phrase: ['add dhal', 'stock dhal'], action: 'CLICK', target: 'btn-add-dhal', roles: ['admin'] },
      { phrase: ['next page', 'next'], action: 'CLICK', target: 'btn-next-page', roles: ['admin'] },
      { phrase: ['previous page'], action: 'CLICK', target: 'btn-prev-page', roles: ['admin'] },
      { phrase: ['logout', 'sign out'], action: 'CLICK', target: 'btn-admin-logout', roles: ['admin'] },

      // ==========================================
      // 5. EMPLOYEE NAVIGATION
      // ==========================================
      {
        phrase: [
          'scan', 'start scan', 'camera', 'start scanner', // English
          'ஸ்கேன்', 'ஸ்கேனரைத் தொடங்கு', 'கேமரா', // Tamil
          'स्कैन', 'स्कैनर शुरू करें', 'कैमरा', // Hindi
          'స్కాన్', // Telugu
          'ಸ್ಕ್ಯಾನ್', // Kannada
          'സ്കാൻ', // Malayalam
          'स्कॅन' // Marathi
        ],
        // FIX: Map "Start Scanner" to NAV with Auto-Start Param
        action: 'NAV', target: '/scan?start=true', roles: ['employee']
      },
      {
        phrase: ['add beneficiary', 'register'],
        action: 'NAV', target: '/add-beneficiary', roles: ['employee']
      },
      {
        phrase: ['history', 'log', 'varalaru', 'வரலாறு', 'इतिहास'],
        action: 'NAV', target: '/history', roles: ['employee']
      },
      {
        phrase: ['my request', 'request'],
        action: 'NAV', target: '/history?tab=requests', roles: ['employee']
      },

      // ==========================================
      // 6. EMPLOYEE ACTIONS
      // ==========================================
      {
        phrase: ['stop scanner', 'stop camera', 'நிறுத்து', 'रोको'],
        action: 'CLICK', target: 'btn-stop-scan', roles: ['employee']
      },
      {
        phrase: ['verify face', 'verify', 'சரிபார்', 'सत्यापित करें'],
        action: 'CLICK', target: 'btn-verify-pay', roles: ['employee']
      },
      {
        phrase: ['confirm dispense', 'dispense', 'வழங்கு', 'वितरण'],
        action: 'CLICK', target: 'btn-confirm-dispense', roles: ['employee']
      },

      // ==========================================
      // 7. PAYMENT ACTIONS
      // ==========================================
      { phrase: ['pay cash', 'cash', 'ரொக்கம்', 'नकद'], action: 'CLICK', target: 'btn-select-cash', roles: ['employee', 'admin'] },
      { phrase: ['pay upi', 'upi', 'online', 'யுபிஐ'], action: 'CLICK', target: 'btn-select-upi', roles: ['employee', 'admin'] },
      { phrase: ['paid', 'payment done', 'செலுத்தப்பட்டது', 'किया गया'], action: 'CLICK', target: 'btn-upi-paid', roles: ['employee', 'admin'] },
      { phrase: ['received', 'confirm cash', 'பெறப்பட்டது', 'प्राप्त किया'], action: 'CLICK', target: 'btn-confirm-cash', roles: ['employee', 'admin'] },

      // ==========================================
      // 8. GENERIC ACTIONS
      // ==========================================
      {
        phrase: ['go back', 'back', 'previous', 'பின்னால்', 'वापस'],
        action: 'NAV', target: -1 // Special handling for navigate(-1)
      },
      {
        phrase: ['logout', 'sign out', 'வெளியேறு', 'लॉग आउट'],
        action: 'CLICK', target: 'btn-logout', roles: ['employee']
      }
    ];

    for (const cmd of allCommands) {
      if (cmd.phrase.some(p => lowerTranscript.includes(p))) {
        // Role Check
        if (cmd.roles && !cmd.roles.includes(role)) {
          speak(t('denied'));
          resetTranscript();
          return;
        }

        // Execute
        if (cmd.action === 'NAV') {
          navigate(cmd.target);
          speak(cmd.target === -1 ? t('nav_back') : "Okay.");
        } else if (cmd.action === 'CLICK') {
          const el = document.getElementById(cmd.target);
          if (el) {
            el.click();
            speak("Okay.");
          } else {
            // Fallback: If click fails, maybe we aren't there?
            speak("I can't do that here.");
          }
        }
        resetTranscript();
        return;
      }
    }

    // 6. BACKEND FALLBACK (NLP) - With Debounce
    if (transcript.length > 3 && isAwake && !isProcessing && !isBotSpeaking) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      silenceTimerRef.current = setTimeout(async () => {
        console.log("Triggering NLP Fallback for:", transcript);
        setIsProcessing(true);
        speak(t('processing')); // "Thinking..."

        try {
          const res = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: transcript,
              language: selectedLang
            })
          });
          const data = await res.json();

          if (data.reply) {
            speak(data.reply);
          } else {
            speak(t('error_generic'));
          }
        } catch (err) {
          console.error("NLP Error:", err);
          speak(t('error_generic'));
        } finally {
          setIsProcessing(false);
          resetTranscript();
        }
      }, 1200); // Wait 1.2 seconds of silence (Faster response)
    }

  }, [transcript, isAwake, isWaitingForLang, selectedLang, navigate, isProcessing, isBotSpeaking]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  if (!browserSupportsSpeechRecognition) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isAwake ? 'scale-100' : 'scale-90 opacity-80'}`}>
      {/* UI Component Code (Simplified) */}
      <div className={`relative group`}>
        {/* Pulse Ring */}
        {isAwake && <div className="absolute -inset-1 bg-indigo-500 rounded-full blur opacity-40 animate-pulse"></div>}

        <button
          onClick={isAwake ? deactivateAssistant : activateAssistant}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all border-4 ${isAwake
            ? 'bg-indigo-600 border-indigo-200 text-white transform scale-110'
            : 'bg-white border-slate-100 text-slate-400 hover:scale-105'
            }`}
        >
          {isBotSpeaking ? <Volume2 size={28} className="animate-pulse" /> : <Mic size={28} />}
        </button>
      </div>

      {/* Transcript Popover */}
      {isAwake && (
        <div className="absolute bottom-20 right-0 bg-white p-4 rounded-2xl shadow-xl w-72 border border-slate-100 transform origin-bottom-right transition-all">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              {isWaitingForLang ? "Select Language" : selectedLang}
            </span>
            <button onClick={() => deactivateAssistant(true)} className="text-slate-300 hover:text-slate-500"><X size={14} /></button>
          </div>
          <p className="text-slate-600 text-sm font-medium min-h-[1.5rem]">
            {transcript || (isBotSpeaking ? "Speaking..." : "Listening...")}
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceAssistant;
