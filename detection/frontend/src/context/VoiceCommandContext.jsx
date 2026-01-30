import React, { createContext, useContext, useState } from 'react';

const VoiceCommandContext = createContext();

export const useVoiceCommands = () => useContext(VoiceCommandContext);

export const VoiceCommandProvider = ({ children }) => {
    // fastCommand: { type: 'NAVIGATE' | 'ACTION' | 'TAB_SWITCH', payload: string, timestamp: number }
    const [lastCommand, setLastCommand] = useState(null);

    const dispatchCommand = (type, payload) => {
        console.log("Dispatching Voice Command:", type, payload);
        setLastCommand({ type, payload, timestamp: Date.now() });
    };

    return (
        <VoiceCommandContext.Provider value={{ lastCommand, dispatchCommand }}>
            {children}
        </VoiceCommandContext.Provider>
    );
};
