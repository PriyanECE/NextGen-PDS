import { useState, useCallback } from 'react';

export const useScreenReader = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);

    const speak = useCallback((text) => {
        if (!window.speechSynthesis) return;

        // Cancel any existing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, []);

    const readScreen = useCallback(() => {
        // Get visible text from the main content
        const mainContent = document.querySelector('main') || document.body;
        const text = mainContent.innerText;
        speak(text);
    }, [speak]);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    return { speak, readScreen, stopSpeaking, isSpeaking };
};
