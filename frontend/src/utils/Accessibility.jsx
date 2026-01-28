import { useState, useCallback } from 'react';

export const useScreenReader = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Feature Disabled as per user request
    const speak = useCallback(() => { }, []);
    const readScreen = useCallback(() => { }, []);
    const stopSpeaking = useCallback(() => { }, []);

    return { speak, readScreen, stopSpeaking, isSpeaking };
};
