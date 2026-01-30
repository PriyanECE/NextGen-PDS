const fetch = require('node-fetch');

class WiFiHardwareService {
    constructor() {
        this.esp32IP = null;
        this.isConnected = false;
        this.currentWeight = 0;
        this.targetWeight = 0;
        this.isDispensing = false;
        this.eventEmitter = null;
        this.pollInterval = null;
    }

    // Set event emitter for real-time updates
    setEventEmitter(emitter) {
        this.eventEmitter = emitter;
    }

    // Emit event to frontend via Socket.IO
    emit(event, data) {
        if (this.eventEmitter) {
            this.eventEmitter(event, data);
        }
    }

    // Connect to ESP32 via WiFi
    async connect(ip = null) {
        try {
            // If no IP provided, try to discover ESP32 on local network
            if (!ip) {
                throw new Error('Please provide ESP32 IP address (e.g., 10.97.19.31)');
            }

            this.esp32IP = ip;
            console.log(`[WiFiService] Connecting to ESP32 at ${ip}...`);

            // Test connection
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`http://${ip}/status`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.isConnected = true;
            console.log('[WiFiService] ✅ Connected to ESP32 via WiFi');
            console.log('[WiFiService] Status:', data);

            this.emit('hardware:connected', { ip, status: data });

            // Start polling for weight updates
            this.startPolling();

            return { success: true, ip, status: data };

        } catch (err) {
            console.error('[WiFiService] Connection failed:', err.message);
            this.isConnected = false;
            throw err;
        }
    }

    // Start polling ESP32 for updates
    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        let consecutiveErrors = 0;
        const MAX_ERRORS = 10; // Allow 10 consecutive failures before disconnecting

        this.pollInterval = setInterval(async () => {
            if (!this.isConnected) return;

            try {
                // Use the unified /status endpoint for all data
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 100000); // 100 second timeout

                const response = await fetch(`http://${this.esp32IP}/status`, {
                    method: 'GET',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    consecutiveErrors = 0; // Reset error counter on success
                    const data = await response.json();
                    this.currentWeight = data.weight || 0;
                    this.stockLevel = data.stock || 0;

                    // Emit data update
                    this.emit('hardware:data', {
                        weight: {
                            current: this.currentWeight,
                            target: this.targetWeight,
                            progress: this.targetWeight > 0 ? (this.currentWeight / this.targetWeight) * 100 : 0
                        },
                        stock: this.stockLevel,
                        dispensing: data.dispensing || false
                    });

                    // Legacy emit for compatibility
                    this.emit('hardware:weight', {
                        current: this.currentWeight,
                        target: this.targetWeight,
                        progress: this.targetWeight > 0 ? (this.currentWeight / this.targetWeight) * 100 : 0
                    });

                    // Check if dispensing is complete
                    if (this.isDispensing && this.currentWeight >= this.targetWeight) {
                        this.isDispensing = false;
                        this.emit('hardware:complete', {
                            finalWeight: this.currentWeight,
                            targetWeight: this.targetWeight
                        });
                    }
                }
            } catch (err) {
                consecutiveErrors++;

                // Only log every 5th error to reduce spam
                if (consecutiveErrors % 5 === 0) {
                    console.warn(`[WiFiService] Polling error (${consecutiveErrors}/${MAX_ERRORS}):`, err.message);
                }

                // Only disconnect after many consecutive failures
                if (consecutiveErrors >= MAX_ERRORS) {
                    console.error('[WiFiService] Too many consecutive errors. Disconnecting...');
                    this.disconnect();
                }
            }
        }, 500); // Poll every 500ms
    }

    // Send dispense command to ESP32
    async dispense(grainType, weight) {
        if (!this.isConnected || !this.esp32IP) {
            throw new Error('ESP32 not connected via WiFi');
        }

        if (this.isDispensing) {
            throw new Error('Already dispensing');
        }

        console.log(`[WiFiService] Sending dispense command: Grain=${grainType}, Weight=${weight}g`);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 100000); // 100s timeout

            const response = await fetch(`http://${this.esp32IP}/dispense`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grainType, weight }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.isDispensing = true;
                this.targetWeight = weight;
                this.currentWeight = 0;

                this.emit('hardware:dispensing_started', {
                    grainType,
                    targetWeight: weight
                });

                return { success: true, message: 'Dispensing started' };
            } else {
                throw new Error(data.error || 'Dispense command failed');
            }

        } catch (err) {
            console.error('[WiFiService] Dispense error:', err.message);
            throw err;
        }
    }

    // Manual Tare Command
    async tare() {
        if (!this.isConnected || !this.esp32IP) {
            throw new Error('ESP32 not connected');
        }

        console.log('[WiFiService] Sending manual TARE command');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 100000); // 100s timeout

            const response = await fetch(`http://${this.esp32IP}/tare`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('Tare failed on ESP32');
            }

            // Reset local weight tracking immediately
            this.currentWeight = 0;
            this.emit('hardware:weight', { current: 0, target: 0, status: 'idle' });
            return { success: true };
        } catch (err) {
            console.error('[WiFiService] Tare error:', err.message);
            throw err;
        }
    }

    // Disconnect from ESP32
    async disconnect() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        this.isConnected = false;
        this.esp32IP = null;
        console.log('[WiFiService] Disconnected');
        this.emit('hardware:disconnected', {});
    }

    getStatus() {
        return {
            connected: this.isConnected,
            ip: this.esp32IP,
            dispensing: this.isDispensing,
            currentWeight: this.currentWeight,
            targetWeight: this.targetWeight,
            stockLevel: this.stockLevel || 0
        };
    }
}

// Singleton instance
const wifiService = new WiFiHardwareService();

module.exports = wifiService;
