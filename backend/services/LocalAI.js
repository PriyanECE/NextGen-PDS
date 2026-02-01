const LocalAI = {
    /**
     * Process a natural language command and return a structured JSON response.
     * @param {string} message - The user's voice command.
     * @param {object} context - Current system context (role, page, data).
     * @returns {object} - { reply: string, action: { type: string, target: string } }
     */
    processCommand: (message, context = {}) => {
        try {
            const cmd = (message || '').toLowerCase().trim();
            const data = context.data || {};
            const role = context.role || 'guest';

            // --- 0. GREETINGS ---
            if (matches(cmd, ['hello', 'hi', 'hey', 'greetings', 'morning', 'afternoon', 'evening'])) {
                return {
                    reply: "Hello! I am ready to help. You can ask me to Scan Cards, Check Stock, or Open Reports.",
                    action: { type: "NONE" }
                };
            }

            // --- 1. DIRECT NAVIGATION INTENTS ---

            // SCAN / DISTRIBUTE
            if (matches(cmd, ['scan', 'distribute', 'ration', 'give food', 'rice', 'wheat', 'kerosene', 'sugar'])) {
                return {
                    reply: "Opening Scanner. Ready to distribute.",
                    action: { type: "NAV", target: "/scan?start=true" }
                };
            }

            // REPORTS / HISTORY
            if (matches(cmd, ['report', 'history', 'transaction', 'log', 'what happened', 'past'])) {
                return {
                    reply: "Opening Reports.",
                    action: { type: "NAV", target: "/admin/reports" }
                };
            }

            // INVENTORY / STOCK
            if (matches(cmd, ['stock', 'inventory', 'supply', 'quantity', 'how much'])) {
                // Contextual answer if possible
                if (data.rice !== undefined) {
                    return {
                        reply: `Opening Inventory. Current Rice stock is ${data.rice} kg.`,
                        action: { type: "NAV", target: "/admin/inventory" }
                    };
                }
                return {
                    reply: "Checking Inventory.",
                    action: { type: "NAV", target: "/admin/inventory" }
                };
            }

            // EMPLOYEES / STAFF
            if (matches(cmd, ['employee', 'staff', 'worker', 'manager', 'who is working'])) {
                return {
                    reply: "Opening Employee Management.",
                    action: { type: "NAV", target: "/admin/setup/employee/new" }
                };
            }

            // NETWORK / MAP
            if (matches(cmd, ['network', 'map', 'district', 'location', 'shop'])) {
                return {
                    reply: "Opening Network Map.",
                    action: { type: "NAV", target: "/admin/network" }
                };
            }

            // BENEFICIARY / REGISTRATION
            if (matches(cmd, ['add beneficiary', 'new card', 'register', 'application', 'add member', 'new family'])) {
                return {
                    reply: "Opening Registration Form.",
                    action: { type: "NAV", target: "/add-beneficiary" }
                };
            }

            // HOME / DASHBOARD
            if (matches(cmd, ['home', 'dashboard', 'main menu', 'back to start'])) {
                const target = role === 'admin' ? '/admin' : '/home';
                return {
                    reply: "Going to Dashboard.",
                    action: { type: "NAV", target: target }
                };
            }

            // --- 2. BUTTON CLICKS / ACTIONS ---

            // UPDATE MODE (Context: /add-beneficiary)
            if (matches(cmd, ['update', 'edit', 'change', 'modify']) && matches(cmd, ['existing', 'mode', 'beneficiary'])) {
                return {
                    reply: "Switching to Update Mode.",
                    action: { type: "CLICK", target: "btn-mode-update" }
                };
            }

            // NEW MODE (Context: /add-beneficiary)
            if (matches(cmd, ['new', 'create', 'add']) && matches(cmd, ['request', 'mode', 'application'])) {
                return {
                    reply: "Switching to New Request Mode.",
                    action: { type: "CLICK", target: "btn-mode-new" }
                };
            }

            // LOGOUT
            if (matches(cmd, ['logout', 'sign out', 'exit app'])) {
                return {
                    reply: "Signing out.",
                    action: { type: "CLICK", target: "btn-logout" }
                };
            }

            // BACK
            if (matches(cmd, ['go back', 'previous', 'return'])) {
                return {
                    reply: "Going back.",
                    action: { type: "NAV", target: -1 }
                };
            }

            // --- 3. FALLBACK ---
            return {
                reply: "I didn't quite catch that. You can say 'Scan', 'Reports', or 'Inventory'.",
                action: { type: "NONE" }
            };

        } catch (error) {
            console.error("LocalAI Error:", error);
            // Fail gracefully
            return {
                reply: "I'm having trouble processing that command.",
                action: { type: "NONE" }
            };
        }
    }
};

/**
 * Helper to check if any keyword exists in the text.
 * @param {string} text 
 * @param {string[]} keywords 
 */
function matches(text, keywords) {
    if (!text || !keywords) return false;
    return keywords.some(k => text.includes(k));
}

module.exports = LocalAI;
