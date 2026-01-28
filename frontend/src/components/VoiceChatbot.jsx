import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Mic, X, Send, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceChatbot = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const shouldDisable = location.pathname === '/' || location.pathname === '/admin' || user.role === 'manager';

  const [isOpen, setIsOpen] = useState(true); // Always Open by default
  const [messages, setMessages] = useState([
    { text: "Hello! I am your Smart PDS Assistant.", sender: 'bot', lang: 'en-US' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('en-US'); // 'en-US' or 'ta-IN'

  const messagesEndRef = useRef(null);
  const recognition = useRef(null);

  // Auto-Speak Welcome Message on Mount
  // useEffect(() => {
  //   if (shouldDisable) return; // Prevent Auto-Speak

  //   // Small delay to ensure browser allows audio after navigation
  //   setTimeout(() => {
  //     speak("Hello! I am your Smart PDS Assistant.", 'en-US');
  //   }, 1000);
  // }, [shouldDisable]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (shouldDisable) return; // STRICT CHECK: Do not init mic

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      // ... rest of init logic ...
      recognition.current.continuous = false; // Manually restart for control
      recognition.current.interimResults = false;

      recognition.current.onstart = () => setIsListening(true);

      recognition.current.onend = () => {
        setIsListening(false);
        // Auto-restart if we are supposed to be listening (Always On)
        // Check if mounted and NOT disabled
        if (recognition.current && !shouldDisable) {
          setTimeout(() => {
            try { recognition.current.start(); } catch (e) { /* ignore */ }
          }, 1000);
        }
      };

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSend(transcript);
      };

      // Auto-Start Listening
      try {
        recognition.current.start();
      } catch (e) { console.log("Auto-start blocked"); }
    }

    return () => {
      if (recognition.current) {
        recognition.current.onend = null; // Prevent restart loop on unmount
        recognition.current.stop();
      }
    }
  }, [shouldDisable]);

  // Update language
  useEffect(() => {
    if (recognition.current) {
      recognition.current.lang = language;
    }
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      recognition.current.stop();
    } else {
      recognition.current.start();
    }
  };

  const handleSend = async (text = inputText) => {
    if (!text.trim()) return;

    // Detect Language based on characters
    let detectedLang = 'en-US';
    // Tamil Unicode Range
    if (/[\u0B80-\u0BFF]/.test(text)) {
      detectedLang = 'ta-IN';
      setLanguage('ta-IN');
    }
    // Hindi Unicode Range
    else if (/[\u0900-\u097F]/.test(text)) {
      detectedLang = 'hi-IN';
      setLanguage('hi-IN');
    }
    else {
      detectedLang = 'en-US';
      setLanguage('en-US');
    }

    // Add User Message
    setMessages(prev => [...prev, { text, sender: 'user', lang: detectedLang }]);
    setInputText('');

    // Logic
    let responseText = "";
    const lowerText = text.toLowerCase();

    if (detectedLang === 'ta-IN') {
      // TAMIL RESPONSE
      if (lowerText.includes('அரிசி') || lowerText.includes('ரேஷன்')) {
        responseText = "உங்கள் குடும்பத்திற்கு 5 கிலோ அரிசி பாக்கி உள்ளது.";
      } else if (lowerText.includes('சர்க்கரை')) {
        responseText = "சர்க்கரை தற்போது கையிருப்பில் இல்லை.";
      } else if (lowerText.includes('விலை') || lowerText.includes('காசு')) {
        responseText = "அரிசி விலை கிலோவுக்கு 3 ரூபாய்.";
      } else {
        responseText = "மன்னிக்கவும்! அரிசி, சர்க்கரை அல்லது விலை பற்றி கேளுங்கள்.";
      }
    } else if (detectedLang === 'hi-IN') {
      // HINDI RESPONSE
      if (lowerText.includes('चावल') || lowerText.includes('राशन')) {
        responseText = "आपके परिवार के लिए 5 किलो चावल बचा है।";
      } else if (lowerText.includes('चीनी') || lowerText.includes('शक्कर')) {
        responseText = "चीनी फिलहाल स्टॉक में नहीं है।";
      } else if (lowerText.includes('कीमत') || lowerText.includes('दान')) {
        responseText = "चावल की कीमत 3 रुपये प्रति किलो है।";
      } else {
        responseText = "क्षमा करें! कृपया चावल, चीनी या कीमत के बारे में पूछें।";
      }
    } else {
      // ENGLISH RESPONSE
      if (lowerText.includes('rice') || lowerText.includes('ration')) {
        responseText = "You have 5kg of rice remaining in your quota.";
      } else if (lowerText.includes('sugar')) {
        responseText = "Sugar is currently out of stock.";
      } else if (lowerText.includes('price') || lowerText.includes('cost')) {
        responseText = "Rice is currently 3 rupees per kg.";
      } else if (lowerText.includes('add')) {
        responseText = "To add stock, please use the Admin Dashboard.";
      } else {
        responseText = "I'm sorry. Ask me about Rice, Sugar, or Prices.";
      }
    }

    // Simulate Bot typing delay
    setTimeout(() => {
      setMessages(prev => [...prev, { text: responseText, sender: 'bot', lang: detectedLang }]);
    }, 1000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Hide visual component on Login, Admin Page, OR if logged in as Manager
  if (shouldDisable) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 mb-4 overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} />
                <span className="font-semibold">{language === 'ta-IN' ? 'உதவியாளர்' : 'PDS Assistant'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (language === 'en-US') setLanguage('hi-IN');
                    else if (language === 'hi-IN') setLanguage('ta-IN');
                    else setLanguage('en-US');
                  }}
                  className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg text-xs font-bold transition-colors"
                >
                  <Globe size={14} />
                  {language === 'en-US' ? 'ENG' : language === 'hi-IN' ? 'हिंदी' : 'தமிழ்'}
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="h-80 overflow-y-auto p-4 bg-slate-50 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center">
              <button
                onClick={toggleListening}
                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                title={language === 'ta-IN' ? "பேச கிளிக் செய்யவும்" : "Click to Speak"}
              >
                <Mic size={20} />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={language === 'ta-IN' ? "ஏதாவது கேட்கவும்..." : "Ask something..."}
                className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                onClick={() => handleSend()}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceChatbot;
