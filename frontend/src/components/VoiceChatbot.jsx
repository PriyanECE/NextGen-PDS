import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, Volume2, X } from 'lucide-react';
import { useVoiceCommands } from '../context/VoiceCommandContext';

const VoiceAssistant = () => {


  const [isAwake, setIsAwake] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');
  const [isSpellingMode, setIsSpellingMode] = useState(false);
  const [spelledName, setSpelledName] = useState("");
  const [isConfirmingName, setIsConfirmingName] = useState(false);
  const [pendingName, setPendingName] = useState("");
  const [pendingData, setPendingData] = useState(null);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const speakStartTimeRef = React.useRef(0);
  const [isWaitingForLang, setIsWaitingForLang] = useState(false);
  const [pendingLetter, setPendingLetter] = useState(null);
  const fallbackTimerRef = React.useRef(null);
  const audioContextRef = React.useRef(null); // Optimized: Reuse AudioContext
  const audioRef = React.useRef(null); // Added for API-based TTS
  const synthesisTimeoutRef = React.useRef(null);

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

  // TRANSLATIONS
  const translations = {
    'en-IN': {
      welcome: "Please select your language. Say English, Tamil, or Hindi.",
      listening: "Listening...",
      processing: "Thinking...",
      home_ctx: "Home Screen. You are at the main menu. You can say 'Distribute Rations', 'Make Payment', or 'Add Beneficiary'.",
      scan_ctx: "Distribution Mode Open. Camera is active. To start, say 'Scan QR' or 'Simulate Scan'.",
      add_ctx: "Registration Form Open. Say 'My name is Ramesh' or 'Spell Name'.",
      pay_ctx: "Payment Screen. You can record transactions here.",
      admin_ctx: "Admin Dashboard. You can check Stock or Reports.",
      ready: "I am ready. Tell me what to do.",
      nav_home: "Navigating to Home",
      nav_scan: "Opening Scanner",
      nav_pay: "Opening Payment Page",
      nav_add: "Opening Registration Page",
      nav_admin: "Opening Admin Dashboard",
      nav_history: "Opening Shop History",
      nav_back: "Going back",
      nav_help: "Opening Voice Help Guide",
      lang_ta: "Tamil Selected. Pesalam.",
      lang_hi: "Hindi Selected. Namaste.",
      lang_en: "English Selected.",
      spell_mode: "Spelling Mode. Say letters one by one.",
      spell_done: "Done. Name updated.",
      spell_cancel: "Cancelled spelling.",
      confirm_yes: "Added. Next?",
      confirm_discard: "Discarded. Say again.",
      ask_confirm: "Did you say ",
      val_taken: "Taken ",
      login_req: "Please log in first.",
      test_speech: "This is a test of the speech system."
    },
    'ta-IN': {
      welcome: "மொழியை தேர்ந்தெடுக்கவும். தமிழ், ஆங்கிலம் அல்லது இந்தி என்று சொல்லுங்கள்.",
      listening: "கவனிக்கிறேன்...",
      processing: "யோசிக்கிறேன்...",
      home_ctx: "முகப்பு திரை. நீங்கள் 'ரேஷன் விநியோகம்', 'பணம் செலுத்துதல்' அல்லது 'புதிய பயனாளி' என்று சொல்லலாம்.",
      scan_ctx: "விநியோக முறை. கேமரா ஆய்வில் உள்ளது. 'QR ஸ்கேன்' என்று சொல்லுங்கள்.",
      add_ctx: "பதிவு படிவம். உங்கள் பெயரைச் சொல்லுங்கள்.",
      pay_ctx: "கட்டண திரை. பரிவர்த்தனைகளை இங்கே பார்க்கலாம்.",
      admin_ctx: "நிர்வாக திரை. சரக்கு விவரங்களை பார்க்கலாம்.",
      ready: "நான் தயார். என்ன செய்ய வேண்டும்?",
      nav_home: "முகப்பு திரைக்கு செல்கிறேன்",
      nav_scan: "ஸ்கேனர் திறக்கிறேன்",
      nav_pay: "கட்டண பக்கத்திற்கு செல்கிறேன்",
      nav_add: "பதிவு பக்கத்திற்கு செல்கிறேன்",
      nav_admin: "நிர்வாக பக்கத்திற்கு செல்கிறேன்",
      nav_history: "வரலாற்றுப் பக்கத்தைத் திறக்கிறேன்",
      nav_back: "பின் செல்கிறேன்",
      nav_help: "உதவிப் பக்கத்தைத் திறக்கிறேன்",
      lang_ta: "தமிழ் தேர்ந்தெடுக்கப்பட்டது. பேசலாம்.",
      lang_hi: "இந்தி.",
      lang_en: "ஆங்கிலம்.",
      spell_mode: "எழுத்து கூட்டு முறை. ஒவ்வொரு எழுத்தாக சொல்லுங்கள்.",
      spell_done: "முடிந்தது. பெயர் மாற்றப்பட்டது.",
      spell_cancel: "ரத்து செய்யப்பட்டது.",
      confirm_yes: "சேர்க்கப்பட்டது. அடுத்து?",
      confirm_discard: "நீக்கப்பட்டது. மீண்டும் சொல்லுங்கள்.",
      ask_confirm: "நீங்கள் சொன்னது ",
      val_taken: "எடுத்துக்கொள்ளப்பட்டது ",
      login_req: "தயவுசெய்து உள்நுழையவும்."
    },
    'hi-IN': {
      welcome: "अपनी भाषा चुनिए. अंग्रेजी, तमिल, या हिंदी बोलिए.",
      listening: "सुन रहा हूँ...",
      processing: "सोच रहा हूँ...",
      home_ctx: "मुख्य मेनू. आप 'राशन वितरण' या 'भुगतान' बोल सकते हैं.",
      scan_ctx: "वितरण मोड. कैमरा चालू है. 'QR स्कैन' बोलिए.",
      add_ctx: "पंजीकरण फॉर्म. अपना नाम बताएं.",
      pay_ctx: "भुगतान स्क्रीन. लेन-देन यहाँ देखें.",
      admin_ctx: "एडमिन डैशबोर्ड. स्टॉक चेक करें.",
      ready: "मैं तैयार हूँ. बताइए क्या करना है.",
      nav_home: "होम पर जा रहा हूँ",
      nav_scan: "स्कैनर खोल रहा हूँ",
      nav_pay: "भुगतान पेज पर जा रहा हूँ",
      nav_add: "पंजीकरण पेज खोल रहा हूँ",
      nav_admin: "एडमिन डैशबोर्ड खोल रहा हूँ",
      nav_history: "इतिहास पृष्ठ खोल रहा हूँ",
      lang_ta: "तमिल.",
      lang_hi: "हिंदी चुनी गई. नमस्ते.",
      lang_en: "अंग्रेजी.",
      spell_mode: "स्पेलिंग मोड. एक एक अक्षर बोलिए.",
      spell_done: "हो गया. नाम अपडेट हो गया.",
      spell_cancel: "रद्द किया गया.",
      confirm_yes: "जोड़ा गया. अगला?",
      confirm_discard: "हटा दिया. फिर से बोलिए.",
      ask_confirm: "क्या आपने कहा ",
      val_taken: "लिया गया ",
      login_req: "कृपया लॉगिन करें."
    },
    'te-IN': {
      welcome: "దయచేసి మీ భాషను ఎంచుకోండి. తెలుగు, హిందీ లేదా ఇంగ్లీష్ అని చెప్పండి.",
      listening: "వింటున్నాను...",
      processing: "ఆలోచిస్తున్నాను...",
      home_ctx: "హోమ్ స్క్రీన్. మీరు 'రేషన్ పంపిణీ' లేదా 'చెల్లింపు' అని చెప్పవచ్చు.",
      scan_ctx: "పంపిణీ విధానం. కెమెరా ఆన్లో ఉంది. 'QR స్కాన్' అని చెప్పండి.",
      add_ctx: "రిజిస్ట్రేషన్ ఫారం. దయచేసి పేరు చెప్పండి.",
      pay_ctx: "చెల్లింపు స్క్రీన్. మీరు లావాదేవీలను ఇక్కడ చూడవచ్చు.",
      admin_ctx: "అడ్మిన్ డాష్బోర్డ్. స్టాక్ లేదా నివేదికలను తనిఖీ చేయండి.",
      ready: "నేను సిద్ధంగా ఉన్నాను. ఏం చేయాలో చెప్పండి.",
      nav_home: "హోమ్కి వెళ్తున్నాను",
      nav_scan: "స్కానర్ తెరుస్తున్నాను",
      nav_pay: "చెల్లింపు పేజీని తెరుస్తున్నాను",
      nav_add: "రిజిస్ట్రేషన్ పేజీని తెరుస్తున్నాను",
      nav_admin: "అడ్మిన్ పేజీని తెరుస్తున్నాను",
      lang_te: "తెలుగు ఎంపిక చేయబడింది. నమస్కారం.",
      spell_mode: "స్పెల్లింగ్ విధానం. అక్షరాలను ఒక్కొక్కటిగా చెప్పండి.",
      spell_done: "పూర్తయింది. పేరు నవీకరించబడింది.",
      spell_cancel: "రద్దు చేయబడింది.",
      confirm_yes: "జోడించబడింది. తరువాత?",
      confirm_discard: "తీసివేయబడింది. మళ్ళీ చెప్పండి.",
      ask_confirm: "మీరు చెప్పింది ",
      val_taken: "తీసుకోబడింది ",
      login_req: "దయచేసి లాగిన్ అవ్వండి.",
      nav_history: "హిస్టరీ పేజీని తెరుస్తున్నాను",
      nav_back: "వెనుకకు వెళ్తున్నాను",
      nav_help: "సహాయం పేజీని తెరుస్తున్నాను"
    },
    'kn-IN': {
      welcome: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ. ಕನ್ನಡ, ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಹಿಂದಿ ಎಂದು ಹೇಳಿ.",
      listening: "ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ...",
      processing: "ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...",
      home_ctx: "ಮುಖಪುಟ. ನೀವು 'ರೇಷನ್ ವಿತರಣೆ' ಅಥವಾ 'ಪಾವತಿ' ಎಂದು ಹೇಳಬಹುದು.",
      scan_ctx: "ವಿತರಣೆ ಮೋಡ್. ಕ್ಯಾಮೆರಾ ಆನ್ ಆಗಿದೆ. 'QR ಸ್ಕ್ಯಾನ್' ಎಂದು ಹೇಳಿ.",
      add_ctx: "ನೋಂದಣಿ ಫಾರ್ಮ್. ದಯವಿಟ್ಟು ಹೆಸರನ್ನು ಹೇಳಿ.",
      pay_ctx: "ಪಾವತಿ ಪರದೆ. ನೀವು ವಹಿವಾಟುಗಳನ್ನು ಇಲ್ಲಿ ನೋಡಬಹುದು.",
      admin_ctx: "ನಿರ್ವಾಹಕ ಡ್ಯಾಶ್ಬೋರ್ಡ್. ದಾಸ್ತಾನು ಪರಿಶೀಲಿಸಿ.",
      ready: "ನಾನು ಸಿದ್ಧವಾಗಿದ್ದೇನೆ. ಏನು ಮಾಡಬೇಕೆಂದು ಹೇಳಿ.",
      nav_home: "ಮುಖಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇನೆ",
      nav_scan: "ಸ್ಕ್ಯಾನರ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ",
      nav_pay: "ಪಾವತಿ ಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇನೆ",
      nav_add: "ನೋಂದಣಿ ಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇನೆ",
      nav_admin: "ನಿರ್ವಾಹಕ ಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇನೆ",
      lang_kn: "ಕನ್ನಡ ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ. ನಮಸ್ಕಾರ.",
      spell_mode: "ಕಾಗುಣಿತ ಮೋಡ್. ಅಕ್ಷರಗಳನ್ನು ಒಂದೊಂದಾಗಿ ಹೇಳಿ.",
      spell_done: "ಮುಗಿದಿದೆ. ಹೆಸರು ನವೀಕರಿಸಲಾಗಿದೆ.",
      spell_cancel: "ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.",
      confirm_yes: "ಸೇರಿಸಲಾಗಿದೆ. ಮುಂದೆ?",
      confirm_discard: "ತೆಗೆದುಹಾಕಲಾಗಿದೆ. ಮತ್ತೆ ಹೇಳಿ.",
      ask_confirm: "ನೀವು ಹೇಳಿದ್ದು ",
      val_taken: "ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ ",
      login_req: "ದಯವಿಟ್ಟು ಲಾಗಿನ್ ಮಾಡಿ.",
      nav_history: "ಇತಿಹಾಸ ಪುಟವನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ",
      nav_back: "ಹಿಂದಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇನೆ",
      nav_help: "ಸಹಾಯ ಪುಟವನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ"
    },
    'mr-IN': {
      welcome: "कृपया आपली भाषा निवडा. मराठी, इंग्रजी किंवा हिंदी बोला.",
      listening: "ऐकत आहे...",
      processing: "विचार करत आहे...",
      home_ctx: "होम स्क्रीन. आपण 'रेशन वाटप' किंवा 'पेमेंट' बोलू शकता.",
      scan_ctx: "वितरण मोड. कॅमेरा चालू आहे. 'QR स्कॅन' बोला.",
      add_ctx: "नोंदणी फॉर्म. कृपया नाव सांगा.",
      pay_ctx: "पेमेंट स्क्रीन. आपण व्यवहार येथे पाहू शकता.",
      admin_ctx: "डॅशबोर्ड. स्टॉक तपासा.",
      ready: "मी तयार आहे. काय करायचे ते सांगा.",
      nav_home: "होम वर जात आहे",
      nav_scan: "स्कॅनर उघडत आहे",
      nav_pay: "पेमेंट पेज वर जात आहे",
      nav_add: "नोंदणी पेज उघडत आहे",
      nav_admin: "डॅशबोर्ड उघडत आहे",
      lang_mr: "मराठी निवडले आहे. नमस्कार.",
      spell_mode: "स्पेलिंग मोड. एक एक अक्षर बोला.",
      spell_done: "झाले. नाव अपडेट झाले.",
      spell_cancel: "रद्द केले.",
      confirm_yes: "जोडले. पुढे?",
      confirm_discard: "काढून टाकले. पुन्हा बोला.",
      ask_confirm: "तुम्ही म्हणालात ",
      val_taken: "घेतले ",
      login_req: "कृपया लॉगिन करा."
    },
    'ml-IN': {
      welcome: "ദയവായി ഭാഷ തിരഞ്ഞെടുക്കുക. മലയാളം, ഇംഗ്ലീഷ് അല്ലെങ്കിൽ ഹിന്ദി എന്ന് പറയുക.",
      listening: "ശ്രദ്ധിക്കുന്നു...",
      processing: "ചിന്തിക്കുന്നു...",
      home_ctx: "ഹോം സ്ക്രീൻ. നിങ്ങൾക്ക് 'റേഷൻ വിതരണം', 'പേയ്മെന്റ്' അല്ലെങ്കിൽ 'പുതിയ ഗുണഭോക്താവ്' എന്ന് പറയാം.",
      scan_ctx: "വിതരണ രീതി. ക്യാമറ ഓൺ ആണ്. 'സ്കാൻ ക്യു ആർ' എന്ന് പറയുക.",
      add_ctx: "രജിസ്ട്രേഷൻ ഫോം. പേര് പറയുക.",
      pay_ctx: "പേയ്മെന്റ് സ്ക്രീൻ. ഇടപാടുകൾ ഇവിടെ കാണാം.",
      admin_ctx: "അഡ്മിൻ ഡാഷ്ബോർഡ്. സ്റ്റോക്ക് പരിശോധിക്കാം.",
      ready: "ഞാൻ തയ്യാറാണ്. എന്താണ് ചെയ്യേണ്ടതെന്ന് പറയുക.",
      nav_home: "ഹോമിലേക്ക് പോകുന്നു",
      nav_scan: "സ്കാനർ തുറക്കുന്നു",
      nav_pay: "പേയ്മെന്റ് പേജിലേക്ക് പോകുന്നു",
      nav_add: "രജിസ്ട്രേഷൻ പേജ് തുറക്കുന്നു",
      nav_admin: "അഡ്മിൻ പേജിലേക്ക് പോകുന്നു",
      nav_history: "ചരിത്രം പേജ് തുറക്കുന്നു",
      nav_back: "പിന്നിലേക്ക് പോകുന്നു",
      nav_help: "സഹായ പേജ് തുറക്കുന്നു",
      lang_ml: "മലയാളം തിരഞ്ഞെടുത്തു. നമസ്കാരം.",
      spell_mode: "സ്പെല്ലിംഗ് മോഡ്. അക്ഷരങ്ങൾ ഒന്നൊന്നായി പറയുക.",
      spell_done: "കഴിഞ്ഞു. പേര് മാറ്റി.",
      spell_cancel: "റദ്ദാക്കി.",
      confirm_yes: "ചേർത്തു. അടുത്തത്?",
      confirm_discard: "ഒഴിവാക്കി. വീണ്ടും പറയുക.",
      ask_confirm: "നിങ്ങൾ പറഞ്ഞത് ",
      val_taken: "എടുത്തു ",
      login_req: "ദയവായി ലോഗിൻ ചെയ്യുക."
    }
  };

  // Helper: Get Translation
  const t = (key) => {
    const langData = translations[selectedLang] || translations['en-IN'];
    return langData[key] || translations['en-IN'][key] || key;
  };

  const { transcript, resetTranscript, browserSupportsSpeechRecognition, listening } = useSpeechRecognition();
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatchCommand } = useVoiceCommands();

  const letterMap = {
    'arun': 'a', 'ag': 'a', 'ahmedabad': 'a',
    'balaji': 'b', 'bombay': 'b', 'bengaluru': 'b',
    'chennai': 'c', 'calcutta': 'c',
    'delhi': 'd', 'dines': 'd',
    'erode': 'e', 'elephant': 'e',
    'faridabad': 'f', 'fish': 'f',
    'ganesh': 'g', 'goa': 'g', 'gun': 'g',
    'hyderabad': 'h', 'hari': 'h',
    'india': 'i', 'indore': 'i',
    'jaipur': 'j', 'jammu': 'j',
    'kanpur': 'k', 'kerala': 'k', 'kumar': 'k',
    'lakh': 'l', 'lucknow': 'l',
    'mumbai': 'm', 'madras': 'm', 'mohan': 'm',
    'nagpur': 'n', 'nashik': 'n',
    'ooty': 'o', 'orange': 'o',
    'pune': 'p', 'patna': 'p', 'prabhu': 'p',
    'queen': 'q',
    'ram': 'r', 'ravi': 'r', 'rajasthan': 'r',
    'surat': 's', 'siva': 's', 'suresh': 's',
    'tamil': 't', 'thanjavur': 't',
    'udaipur': 'u',
    'vijay': 'v', 'varanasi': 'v',
    'warangal': 'w',
    'xray': 'x',
    'yamuna': 'y',
    'zebra': 'z'
  };

  // Startup: Ask for Language
  const hasWelcomed = React.useRef(false);






  const askBackend = async (text) => {
    setIsProcessing(true);
    try {
      const token = JSON.parse(localStorage.getItem('user'))?.token || localStorage.getItem('token');
      // Mock token if not found to prevent lock out in dev
      const authHeader = token ? `Bearer ${token}` : '';
      const userJson = JSON.parse(localStorage.getItem('user') || '{}');
      const role = userJson?.role === 'manager' ? 'admin' : 'employee';

      if (!token && window.location.pathname !== '/scan') {
        // strict check removed for demo
      }

      const res = await fetch('http://localhost:5000/api/ai/chat', { // CHANGED to match existing endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ message: text, language: selectedLang, role: role })
      });

      if (res.status === 401) { navigate('/'); return; }

      const data = await res.json();

      if (data.action === 'FORM_FILL') {
        dispatchCommand('FORM_FILL', data.data);
        speak(t('val_taken'));
      } else if (data.action === 'NAVIGATION') {
        // MICRO-RBAC CHECK for Backend Responses
        const userJson = JSON.parse(localStorage.getItem('user') || '{}');
        const role = userJson?.role === 'manager' ? 'admin' : 'employee';

        // 1. Admin Route Protection
        if (data.target === '/admin' && role !== 'admin') {
          speak("Access Denied. Admin privileges required.");
        }
        // 2. Employee Route Protection (Scanner/Registration)
        else if ((data.target === '/scan' || data.target === '/add-beneficiary') && role === 'admin') {
          speak("This feature is for Shop Employees only.");
        }
        else if (data.target === 'BACK') {
          navigate(-1);
          speak(t('nav_back'));
        } else {
          navigate(data.target);
          if (data.target === '/home') speak(t('nav_home'));
          else if (data.target === '/scan') speak(t('nav_scan'));
          else if (data.target === '/payment') speak(t('nav_pay'));
          else if (data.target === '/add-beneficiary') speak(t('nav_add'));
          else if (data.target === '/admin') speak(t('nav_admin'));
          else if (data.target === '/history') speak(t('nav_history'));
          else if (data.target === '/help') speak(t('nav_help'));
          else speak(t('processing'));
        }
      } else if (data.text) { // Changed data.reply to data.text to match backend
        speak(data.text);
      } else if (data.reply) {
        speak(data.reply);
      }
    } catch (e) {
      console.error(e);
      speak("Error connecting to server.");
    } finally {
      setIsProcessing(false);
      resetTranscript();
    }
  };

  const getPageContext = (path) => {
    if (path.startsWith('/home')) return t('home_ctx');
    if (path.startsWith('/scan')) return t('scan_ctx');
    if (path.startsWith('/add-beneficiary')) return t('add_ctx');
    if (path.startsWith('/payment')) return t('pay_ctx');
    if (path.startsWith('/admin')) return t('admin_ctx');
    return t('ready');
  };

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


  // Auto-sleep timer removed per user request: assistant stays awake until stop command

  const activateAssistant = () => {
    playSound('activate');
    setIsAwake(true);
    setIsWaitingForLang(true);
    resetTranscript();
    speak(translations['en-IN'].welcome); // Force initial prompt in English for universality
  };

  const deactivateAssistant = (silent = false) => {
    if (!silent) speak("Goodbye");
    else playSound('deactivate');
    setIsAwake(false);
    setIsWaitingForLang(false);
    setResponseMsg('');
    resetTranscript();
    setSelectedLang('en-IN'); // Reset to English for reliable universal wake-up words
  };

  const speak = (text, forceLang = null) => {
    if (!text) return;
    const currentLang = forceLang || (selectedLang ? selectedLang.trim() : 'en-IN');
    console.log(`[VoiceChatbot] speak() called with: "${text}" in Lang: "${currentLang}"`);

    // 0. STOP PREVIOUS & RESUME (Chrome Fix)
    window.speechSynthesis.cancel();
    if (synthesisTimeoutRef.current) {
      clearTimeout(synthesisTimeoutRef.current);
      synthesisTimeoutRef.current = null;
    }

    if (window.speechSynthesis.paused) window.speechSynthesis.resume();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }

    // 1. STATE & TRANSCRIPT CLEANUP
    setIsBotSpeaking(true);
    speakStartTimeRef.current = Date.now();
    resetTranscript();

    // 2. CHECK IF WE SHOULD USE API (For Indian Languages)
    const indianLangs = ['ta-IN', 'hi-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN'];
    const isIndian = indianLangs.some(l => currentLang.toLowerCase() === l.toLowerCase());

    console.log(`[TTS] isIndian: ${isIndian}`);

    if (isIndian) {
      try {
        const ttsUrl = `http://localhost:5000/api/tts?text=${encodeURIComponent(text)}&lang=${currentLang}`;
        console.log("[TTS] Calling Proxy:", ttsUrl);

        const audio = new Audio();
        audio.src = ttsUrl;
        audioRef.current = audio;

        audio.onplay = () => {
          console.log("[TTS] API Audio Playing");
          setIsBotSpeaking(true);
          // NEW: If proxy audio starts, strictly block synthesis
          if (synthesisTimeoutRef.current) {
            clearTimeout(synthesisTimeoutRef.current);
            synthesisTimeoutRef.current = null;
          }
          window.speechSynthesis.cancel();
        };

        audio.onended = () => {
          console.log("[TTS] API Audio Ended");
          setIsBotSpeaking(false);
          audioRef.current = null;
        };

        audio.onerror = (e) => {
          console.error("[TTS] API Audio Error (Proxy failed):", e);
          speakWithSynthesis(text, currentLang);
        };

        // Attempt play
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("[TTS] API Play Blocked:", error);
            speakWithSynthesis(text, currentLang);
          });
        }
        return;
      } catch (err) {
        console.error("[TTS] Proxy setup error:", err);
        speakWithSynthesis(text, currentLang);
      }
    }

    // Default Fallback
    speakWithSynthesis(text, currentLang);
  };

  const speakWithSynthesis = (text, lang) => {
    // 2. CREATE UTTERANCE
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    const priorityMap = {
      'en-IN': ['Google', 'English India', 'India', 'English'],
      'ta-IN': ['Tamil', 'India'],
      'hi-IN': ['Hindi', 'India'],
      'te-IN': ['Telugu', 'India'],
      'kn-IN': ['Kannada', 'India'],
      'ml-IN': ['Malayalam', 'India'],
      'mr-IN': ['Marathi', 'India']
    };

    let voice = null;
    const priorityKeywords = priorityMap[lang] || ['India'];

    // STRICT MATCH: Only use a voice if it matches the requested language
    for (const keyword of priorityKeywords) {
      voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]) && v.name.includes(keyword));
      if (voice) break;
    }

    if (!voice) voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));

    // If still no native voice, ONLY fall back to English if the text is English-compatible
    if (!voice && !/^[A-Za-z0-9\s.,!?'"]+$/.test(text)) {
      console.warn("[TTS] No native voice for Indian language text. Staying silent to avoid 'Messed up English' reading.");
      setIsBotSpeaking(false);
      return;
    }

    if (!voice) voice = voices.find(v => v.name.includes('English India') || v.name.includes('India'));

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = lang;
    }

    // 3. EVENT HANDLERS
    utterance.onstart = () => {
      console.log("TTS Started:", text);
      setIsBotSpeaking(true);
    };
    utterance.onend = () => {
      console.log("TTS Ended");
      setTimeout(() => { setIsBotSpeaking(false); }, 150);
    };
    utterance.onerror = (e) => {
      console.error("TTS Error:", e);
      setIsBotSpeaking(false);
    };

    // 4. SPEAK WITH SHORT DELAY (Chrome Fix)
    if (synthesisTimeoutRef.current) clearTimeout(synthesisTimeoutRef.current);
    synthesisTimeoutRef.current = setTimeout(() => {
      window.speechSynthesis.speak(utterance);
      synthesisTimeoutRef.current = null;
    }, 50); // Small delay for Chrome stability
  };


  const speakAndNavigate = (text, path) => {
    navigate(path);
    setTimeout(() => {
      const contextMsg = getPageContext(path);
      speak(contextMsg);
    }, 300);
    resetTranscript();
  };

  if (!browserSupportsSpeechRecognition) return null;

  // Start listening
  // Start/Restart listening when language or location changes
  useEffect(() => {
    const isLoginPage = location.pathname === '/' || location.pathname === '/login';
    // We listen on all pages except true login/root to ensure the Assistant remains reactive
    if (isLoginPage) {
      SpeechRecognition.stopListening();
      return;
    }

    if (browserSupportsSpeechRecognition) {
      // 1. Stop current instance
      SpeechRecognition.stopListening();

      // 2. Wait briefly to ensure teardown, then restart with new lang
      const timer = setTimeout(() => {
        console.log(`[Mic] Switching to ${selectedLang}`);
        SpeechRecognition.startListening({
          continuous: true,
          language: selectedLang
        }).catch(e => console.log("Mic restart error:", e));
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [browserSupportsSpeechRecognition, selectedLang, location.pathname]);

  // Handle Speech Logic
  useEffect(() => {
    if (!transcript) return;
    const lowerTranscript = transcript.toLowerCase();

    // --- BARGE-IN IMPLEMENTATION ---
    // If bot is speaking and user starts talking, shut up immediately.
    // ADD COOLDOWN: Don't allow barge-in for the first 1.5 seconds to avoid self-voice triggers
    if (isBotSpeaking) {
      const timeSinceStart = Date.now() - speakStartTimeRef.current;
      if (timeSinceStart > 1500 && transcript.length > 10) {
        console.log("Barge-in Detected: Stopping TTS");
        window.speechSynthesis.cancel();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
        }
        setIsBotSpeaking(false);
      }
      return; // While bot is speaking, don't process commands to avoid loops
    }

    // E. WAKE WORD LOGIC
    if (!isAwake) {
      const wakeWords = [
        'hello', 'hey', 'start', 'begin', 'listen', 'wake up',
        'vanakkam', 'namaste', 'namaskaram', // Transliterated
        'வணக்கம்', 'ஹலோ', 'ஸ்டார்ட்', // Tamil
        'नमस्ते', 'हेलो', 'शुरू', 'स्टार्ट', // Hindi
        'നമസ്കാരം', 'ഹലോ', // Malayalam
        'ನಮಸ್ಕಾರ', 'ಹಲೋ', // Kannada
        'నమస్కారం', 'హలో', 'స్టార్ట్' // Telugu
      ];
      const hasWakeWord = wakeWords.some(w => lowerTranscript.includes(w));

      if (hasWakeWord) {
        // Redundant call removed: activateAssistant handles the greeting
        activateAssistant();
      }
      return; // Ignore everything else if sleeping

    }

    // A. SYSTEM COMMANDS (Instant)
    if (lowerTranscript.includes('stop') || lowerTranscript.includes('shut up') || lowerTranscript.includes('quiet') || lowerTranscript.includes('exit') || lowerTranscript.includes('sleep')) {
      window.speechSynthesis.cancel();
      setIsBotSpeaking(false);
      deactivateAssistant();
      return;
    }

    // B. LANGUAGE SWITCHING
    // Check for language names in English or Native
    const langMap = {
      'tamil': 'ta-IN', 'thamizh': 'ta-IN', 'தமிழ்': 'ta-IN',
      'hindi': 'hi-IN', 'hindhi': 'hi-IN', 'हिंदी': 'hi-IN',
      'english': 'en-IN',
      'telugu': 'te-IN', 'తెలుగు': 'te-IN',
      'kannada': 'kn-IN', 'ಕನ್ನಡ': 'kn-IN',
      'malayalam': 'ml-IN', 'മലയാളം': 'ml-IN',
      'marathi': 'mr-IN', 'मराठी': 'mr-IN'
    };

    let newLang = null;
    for (const [key, code] of Object.entries(langMap)) {
      if (lowerTranscript.includes(key)) {
        newLang = code;
        break;
      }
    }

    if (newLang) {
      console.log("Language Detected:", newLang);
      setSelectedLang(newLang);
      setIsWaitingForLang(false);

      // Confirmation
      setTimeout(() => {
        const shortCode = newLang.split('-')[0];
        const confirmMsg = translations[newLang][`lang_${shortCode}`] || "Language Selected";
        speak(confirmMsg, newLang); // Pass newLang explicitly
      }, 500);

      resetTranscript();
      return;
    }

    // If we are waiting for language but haven't hit a 'newLang' yet, STOP HERE.
    if (isWaitingForLang) {
      console.log("[Flow] Waiting for language selection...");
      return;
    }

    // C. INSTANT NAVIGATION (Mid-sentence reaction)
    const userJson = JSON.parse(localStorage.getItem('user') || '{}');
    const role = userJson?.role === 'manager' ? 'admin' : 'employee';

    // C. INSTANT COMMANDS (Minimal Set - Let NLP handle Logic)
    // We only keep critical "UI Actions" or "Emergency Stops" here.
    // Navigation is now handled 100% by the Backend AI to ensure strict Role Enforcement.
    const instantCommands = [
      // --- NAVIGATION (Universal) ---
      { phrase: 'go to home,home,முகப்பு,मुखपृष्ठ,ഹോം,ముందు పుట,ಮನೆ', action: 'NAV', target: '/home' },
      { phrase: 'go to dashboard,dashboard,டேஷ்போர்டு,डैशबोर्ड,ഡാഷ്ബോർഡ്,డాష్బోర్డ్,ಡ್ಯಾಶ್ಬೋರ್ಡ್', action: 'NAV', target: '/admin', allowedRoles: ['admin'] },
      { phrase: 'go to history,history,வரலாறு,इतिहास,ചരിത്രം,చరిత్ర,ಇತಿಹಾಸ', action: 'NAV', target: '/history', allowedRoles: ['employee'] },
      { phrase: 'go to scan,scan,ஸ்கேன்,स्कैन,സ്കാൻ,స్కాన్,స్ಕ್ಯಾನ್', action: 'NAV', target: '/scan', allowedRoles: ['employee'] },
      { phrase: 'go to registration,registration,பதிவு,पंजीकरण,രജിസ്ട്രേഷൻ,నమోదు,ನೋಂದಣಿ', action: 'NAV', target: '/add-beneficiary', allowedRoles: ['employee'] },
      { phrase: 'add beneficiary,புதிய பயனாளி,पंजीकरण,രജിസ്ട്രേഷൻ,నమోదు,ನೋಂದಣಿ', action: 'NAV', target: '/add-beneficiary', allowedRoles: ['employee'] },

      // --- NATIVE SCRIPT NAVIGATION ---
      { phrase: 'முகப்பு,home', action: 'NAV', target: '/home' }, // Home (Tamil)
      { phrase: 'डैशबोर्ड,dashboard', action: 'NAV', target: '/admin', allowedRoles: ['admin'] }, // Dashboard (Hindi)
      { phrase: 'റിപ്പോർട്ടുകൾ,report', action: 'CLICK', target: 'btn-tab-reports', allowedRoles: ['admin'] }, // Reports (Malayalam)
      { phrase: 'അഭ്യർത്ഥനകൾ,request', action: 'CLICK', target: 'btn-tab-requests', allowedRoles: ['admin'] }, // Requests (Malayalam)
      { phrase: 'നിവേദനങ്ങൾ,request', action: 'CLICK', target: 'btn-tab-requests', allowedRoles: ['admin'] }, // Alternative Requests (Malayalam)
      { phrase: 'നിവേദികൾ,report', action: 'CLICK', target: 'btn-tab-reports', allowedRoles: ['admin'] }, // Reports (Telugu)
      { phrase: 'വരദികൾ,report', action: 'CLICK', target: 'btn-tab-reports', allowedRoles: ['admin'] }, // Reports (Kannada)
      { phrase: 'അടുത്ത പേജ്,next page', action: 'CLICK', target: 'btn-next-page', allowedRoles: ['admin'] }, // Next Page (Malayalam)
      { phrase: 'മുമ്പത്തെ പേജ്,prev page', action: 'CLICK', target: 'btn-prev-page', allowedRoles: ['admin'] }, // Prev Page (Malayalam)
      { phrase: 'ലോഗൗട്ട്,logout', action: 'CLICK', target: 'btn-logout', allowedRoles: ['employee', 'admin'] }, // Logout (Malayalam)
      { phrase: 'உள்நுழையவும்,login', action: 'NAV', target: '/' }, // Login (Tamil)

      // --- ADMIN TAB NAVIGATION (CLICK-BASED) ---
      // --- ADMIN TAB NAVIGATION ---
      { phrase: 'report,அறிக்கை,रिपोर्ट,റിപ്പോർട്ട്,నివేదిక,ವರದಿ', action: 'NAV', target: '/admin?tab=reports', allowedRoles: ['admin'] },
      { phrase: 'request,கோரிக்கை,अनुरोध,അഭ്യർത്ഥന,అభ్యర్థన,ವಿನಂತಿ', action: 'NAV', target: '/admin?tab=requests', allowedRoles: ['admin'] },
      { phrase: 'inventory,stock,இருப்பு,मालसूची,ഇൻവെന്ററി,ఇన్వెంటరీ,దాಸ್ತಾನು', action: 'NAV', target: '/admin?tab=inventory', allowedRoles: ['admin'] },
      { phrase: 'network,shops,கடைகள்,नेटवर्क,നെറ്റ്‌വർക്ക്,నెట్‌వర్క్,ನೆಟ್‌ವರ್ಕ್', action: 'NAV', target: '/admin?tab=network', allowedRoles: ['admin'] },
      { phrase: 'log,history,பதிவுகள்,लॉग्स,ലോഗുകൾ,లాగ్‌లు,ಲಾಗ್‌ಗಳು', action: 'NAV', target: '/admin?tab=logs', allowedRoles: ['admin'] },

      // --- ADMIN ACTIONS ---
      { phrase: 'approve,அங்கீகரி,स्वीकार करें,അംഗീകരിക്കുക,అంగీకరించు,అంగీకారం,ಅಂಗೀಕರಿಸು,अंगुठा', action: 'CLICK', target: 'query:[id^="btn-approve-"]', allowedRoles: ['admin'] },
      { phrase: 'deny,reject,மறுக்க,अस्वीकार करें,അസ്വീകരിക്കുക,తిరస్కరించు,తిరస్కారం,ತಿರಸ್ಕರಿಸು', action: 'CLICK', target: 'query:[id^="btn-deny-"]', allowedRoles: ['admin'] },
      { phrase: 'review,ஆய்வு,समीक्षा करें,അവലോകനം ചെയ്യുക,సమీక్షించు,సమీక్ష,ವಿಮರ್ಶಿಸು', action: 'CLICK', target: 'query:[id^="btn-review-"]', allowedRoles: ['admin'] },

      // --- PAGINATION & STOCK ---
      { phrase: 'next page,அடுத்த பக்கம்,अगला पृष्ठ,അടുത്ത പേജ്,మరుసటి పేజీ,ಮುಂದಿನ ಪುಟ', action: 'CLICK', target: 'btn-next-page', allowedRoles: ['admin'] },
      { phrase: 'previous page,முந்தைய பக்கம்,पिछला पृष्ठ,മുമ്പത്തെ പേജ്,మునుపటి పేజీ,ಹಿಂದಿನ ಪುಟ', action: 'CLICK', target: 'btn-prev-page', allowedRoles: ['admin'] },
      { phrase: 'add rice,அரிசி,चावल जोड़ें,അരിശി ചേർക്കുക,బియ్యం జోడించు,ಬಿಕ್ಕಿ ಸೇರಿಸಿ,ಅಕ್ಕಿ ಸೇರಿಸಿ', action: 'CLICK', target: 'btn-add-rice', allowedRoles: ['admin'] },
      { phrase: 'add dhal,பருப்பு,दाल जोड़ें,പരിപ്പ് ചേർക്കുക,పప్పు జోడించు,ಬೇಳೆ ಸೇರಿಸಿ', action: 'CLICK', target: 'btn-add-dhal', allowedRoles: ['admin'] },

      // --- EMPLOYEE FLOW ---
      { phrase: 'view dispense log,history,வரலாறு,இतिहास,ചരിത്രം,చరిత్ర,ಇతిಹಾಸ', action: 'CLICK', target: 'btn-tab-dispense-logs', allowedRoles: ['employee'] },
      { phrase: 'view my requests,requests,விண்ணப்பங்கள்,अनुरोध,അഭ്യർത്ഥനകൾ,అభ్యర్థనలు,ವಿನಂತಿಗಳು', action: 'CLICK', target: 'btn-tab-my-requests', allowedRoles: ['employee'] },
      { phrase: 'click scan,scanner,ஸ்கேனர்,स्कैनर,സ്കാനർ,స్కానర్,ಸ್ಕ್ಯಾನ್', action: 'CLICK', target: 'btn-nav-scan', allowedRoles: ['employee'] },
      { phrase: 'click history,பரிவர்த்தனை,लेनदेन,ഇടപാടുകൾ,లావాదేవీలు,ವ್ಯವಹಾರಗಳು', action: 'CLICK', target: 'btn-nav-history', allowedRoles: ['employee'] },
      { phrase: 'click add,புதிய பயனாளி,पंजीकरण,രജിസ്ട്രേഷൻ,నమోదు,ನೋಂದಣಿ', action: 'CLICK', target: 'btn-nav-add', allowedRoles: ['employee'] },

      // --- DISPENSE ACTIONS ---
      { phrase: 'start scanner,camera on,கேமராவைத் திற,कैमरा खोलें,ക്യാമറ തുറക്കുക,కెమెరా తెరవండి,ಕ್ಯಾಮರಾ ತೆರೆಯಿರಿ', action: 'CLICK', target: 'btn-start-scan', allowedRoles: ['employee'] },
      { phrase: 'verify,சரிபார்,सत्यापित करें,പരിശോധിക്കുക,ధృవీకరించు,ದೃಢೀಕರಿಸು', action: 'CLICK', target: 'btn-verify-pay', allowedRoles: ['employee'] },
      { phrase: 'pay cash,பணம்,नकद भुगतान,നഗദായി നൽകുക,నగదు చెల్లించు,ನಗದು ಪಾವತಿಸಿ', action: 'CLICK', target: 'btn-pay-cash', allowedRoles: ['employee'] },
      { phrase: 'confirm,dispense,விநியோகி,वितरित करें,വിതരണം ചെയ്യുക,పంపిణీ చేయు,ವಿತರಿಸು', action: 'CLICK', target: 'btn-confirm-dispense', allowedRoles: ['employee'] },
      { phrase: 'capture,photo,புகைப்படம்,फोटो लें,ഫോട്ടോ എടുക്കുക,ఫోటో తీయి,ಫೋಟೋ ತೆಗಿ', action: 'CLICK', target: 'btn-capture-photo', allowedRoles: ['employee'] },
      { phrase: 'submit,சமர்ப்பி,जमा करें,സമർപ്പിക്കുക,సమర్పించు,ಸಲ್ಲಿಸು', action: 'CLICK', target: 'btn-submit-request', allowedRoles: ['employee'] },
      { phrase: 'simulate scan,சிமுலேட்,सिमुलेशन,ಸಿಮ್ಯುಲೇಟ್', action: 'CLICK', target: 'btn-sim-1001', allowedRoles: ['employee'] },

      // --- SYSTEM ---
      { phrase: 'logout,sign out,வெளியேறு,लॉगआउट,ലോഗൗട്ട്,లాగౌట్,ನಿಷ್ಕ್ರಮಿಸು', action: 'CLICK', target: 'btn-logout', allowedRoles: ['employee', 'admin'] },
      { phrase: 'stop,shut up,நிறுத்து,रुको,നിർത്തുക,ఆపు,ನಿಲ್ಲಿಸು', action: 'CLICK', target: 'btn-stop-scan', allowedRoles: ['employee'] }
    ];




    for (const cmd of instantCommands) {
      const phrases = cmd.phrase.split(',').map(p => p.trim().toLowerCase());
      const isMatch = phrases.some(p => lowerTranscript.includes(p));

      if (isMatch) {
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

        if (cmd.allowedRoles && !cmd.allowedRoles.includes(role)) {
          const deniedMsg = role === 'admin'
            ? "This feature is for Shop Employees only."
            : "Sorry, only Admins can access that.";
          speak(deniedMsg);
          resetTranscript();
          return;
        }

        if (cmd.action === 'CLICK') {
          let btn = null;
          if (cmd.target.startsWith('query:')) {
            const selector = cmd.target.replace('query:', '');
            btn = document.querySelector(selector);
          } else {
            btn = document.getElementById(cmd.target);
          }

          if (btn) {
            btn.click();
            speak("OK");
          } else {
            speak("Button not visible.");
          }
        } else if (cmd.action === 'NAV') {
          navigate(cmd.target);
          speak("OK");
        } else if (cmd.target === 'BACK') {
          navigate(-1);
          speak(t(cmd.msg));
        } else {
          navigate(cmd.target);
          speak(t(cmd.msg));
        }


        resetTranscript();
        return;
      }
    }

    // SILENCE DETECTION FOR GENERAL QUERY PROCESSING
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    fallbackTimerRef.current = setTimeout(() => {
      // Only send if it wasn't an instant command and we have significant input
      if (transcript.trim().length > 1) {
        askBackend(transcript);
      }

    }, 800);


  }, [transcript, isAwake]);

  // ...

  // RENDER LOGIC UPDATE (Enhanced for visibility)
  const isLoginPage = location.pathname === '/' || location.pathname === '/login';

  // Always show on app pages, hide only on login/root
  if (isLoginPage) return null;

  if (!browserSupportsSpeechRecognition) return null;

  return (
    <div className="fixed bottom-8 right-8 flex flex-col items-end z-[99999] font-sans transition-all duration-500">
      {/* Chat Interface - ONLY SHOW IF AWAKE */}
      {isAwake && (
        <div className={`
              mb-4 w-80 bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl overflow-hidden 
              transition-all duration-500 ease-in-out ring-1 ring-black/5 origin-bottom-right
              opacity-100 scale-100 translate-y-0
          `}>
          {/* ... Header and Body content ... */}
          {/* Header */}
          <div className={`
                      p-3 flex items-center justify-between text-white shadow-sm transition-colors duration-500
                      bg-gradient-to-r from-indigo-600 to-purple-600
                  `}>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                <Volume2 size={16} className="text-white" />
              </div>
              <span className="text-sm font-semibold tracking-wide">
                {languages.find(l => l.code === selectedLang)?.name.split(' ')[0] || 'Smart'} Assistant
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => speak(getPageContext(window.location.pathname))}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title="Read Screen">
                <Volume2 size={14} />
              </button>
              <button onClick={() => deactivateAssistant(true)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title="Close">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-indigo-100">
                <span className="text-xs font-bold text-indigo-600">AI</span>
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-tl-none p-3 text-sm text-slate-700 shadow-sm border border-slate-200">
                <p>{responseMsg || t('listening')}</p>
              </div>
            </div>
            <div className="flex gap-3 items-end justify-end">
              <div className={`
                              max-w-[85%] rounded-2xl rounded-tr-none p-3 text-sm shadow-sm border
                              ${transcript
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent'
                  : 'bg-white border-slate-100 text-slate-400 italic'}
                          `}>
                <p>{transcript || "..."}</p>
              </div>
            </div>
          </div>

          {/* Footer / Controls */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            {/* ... Language Selector ... */}
            {/* Simplified for brevity in replacement, ideally keep existing */}
            <div className="relative group">
              <select value={selectedLang} onChange={(e) => { setSelectedLang(e.target.value); resetTranscript(); }} className="text-xs border rounded p-1">
                {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-100 shadow-sm">
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Active</span>
            </div>
          </div>

        </div>
      )}

      {/* Main Floating Button (FAB) - HIDDEN IF NOT AWAKE? Or maybe just small? 
          User said "only when i say... it should pop". 
          Let's make it invisible (opacity 0) or unrendered when sleeping, 
          BUT we need user to be able to know it exists? 
          Actually user said "i dont want that to work in login page". 
          If I hide it completely, they can't click to start manually if mic fails. 
          But "pop" implies appearing. 
          Let's render NOTHING when sleeping, relying PURELY on voice to wake it up. 
      */}

      {/* Main Floating Button (FAB) - Always visible for manual trigger */}
      <button
        onClick={() => isAwake ? deactivateAssistant() : activateAssistant()}
        className={`
                group relative flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-500 cursor-pointer
                ${isAwake
            ? 'bg-gradient-to-br from-red-500 to-pink-600 ring-[6px] ring-red-500/20 rotate-180'
            : 'bg-gradient-to-br from-indigo-600 to-blue-600 hover:scale-110 hover:shadow-indigo-500/30'}
            `}>

        {/* Pulse Effect Ring (Only when sleeping to attract attention) */}
        {!isAwake && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-20 animate-ping"></span>
        )}

        {/* Icon */}
        <span className={`transition-transform duration-500 ${isAwake ? 'rotate-180' : ''}`}>
          {isAwake ? <X className="text-white w-6 h-6" /> : <Mic className="text-white w-7 h-7" />}
        </span>
      </button>
    </div>
  );
};

export default VoiceAssistant;
