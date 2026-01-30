const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class SerialService {
    constructor() {
        this.port = null;
        this.parser = null;
        this.isConnected = false;
        this.currentWeight = 0;
        this.targetWeight = 0;
        this.isDispensing = false;
        this.eventEmitter = null; // Will be set by server.js for Socket.IO
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

    // Auto-detect ESP32 on available ports
    async detectESP32() {
        try {
            const { SerialPort } = require('serialport');
            const ports = await SerialPort.list();

            console.log('[SerialService] Available ports:', ports.map(p => p.path));

            // Try to find ESP32 (usually shows as CH340, CP210x, or similar)
            const esp32Port = ports.find(p =>
                p.manufacturer?.includes('CH340') ||
                p.manufacturer?.includes('CP210') ||
                p.manufacturer?.includes('Silicon Labs') ||
                p.vendorId === '1a86' || // CH340
                p.vendorId === '10c4'    // CP210x
            );

            if (esp32Port) {
                console.log('[SerialService] ESP32 detected on:', esp32Port.path);
                return esp32Port.path;
            }

            // Fallback: Return first available COM port
            if (ports.length > 0) {
                console.log('[SerialService] No ESP32 detected, using first available port:', ports[0].path);
                return ports[0].path;
            }

            throw new Error('No serial ports available');
        } catch (err) {
            console.error('[SerialService] Port detection error:', err);
            throw err;
        }
    }

    // Connect to ESP32
    async connect(portPath = null) {
        try {
            // Auto-detect if no port specified
            if (!portPath) {
                portPath = await this.detectESP32();
            }

            console.log(`[SerialService] Connecting to ${portPath}...`);

            this.port = new SerialPort({
                path: portPath,
                baudRate: 115200, // Match Arduino code
                autoOpen: false
            });

            // Setup parser for line-based reading
            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

            // Listen for data from ESP32
            this.parser.on('data', (line) => this.handleData(line));

            // Error handling
            this.port.on('error', (err) => {
                console.error('[SerialService] Port error:', err.message);
                this.isConnected = false;
                this.emit('hardware:error', { message: err.message });
            });

            this.port.on('close', () => {
                console.log('[SerialService] Port closed');
                this.isConnected = false;
                this.emit('hardware:disconnected', {});
            });

            // Open the port
            await new Promise((resolve, reject) => {
                this.port.open((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            this.isConnected = true;
            console.log('[SerialService] ✅ Connected to ESP32');
            this.emit('hardware:connected', { port: portPath });

            return { success: true, port: portPath };

        } catch (err) {
            console.error('[SerialService] Connection failed:', err);
            this.isConnected = false;
            throw err;
        }
    }

    // Handle incoming data from ESP32
    handleData(line) {
        console.log('[ESP32]', line);

        // Parse weight updates
        const weightMatch = line.match(/Weight:\s*([\d.]+)\s*g/);
        if (weightMatch) {
            this.currentWeight = parseFloat(weightMatch[1]);
            this.emit('hardware:weight', {
                current: this.currentWeight,
                target: this.targetWeight,
                progress: this.targetWeight > 0 ? (this.currentWeight / this.targetWeight) * 100 : 0
            });
        }

        // Detect completion
        if (line.includes('✅ Completed!') || line.includes('Target reached!')) {
            this.isDispensing = false;
            this.emit('hardware:complete', {
                finalWeight: this.currentWeight,
                targetWeight: this.targetWeight
            });
        }

        // Detect errors
        if (line.includes('❌') || line.includes('Invalid')) {
            this.emit('hardware:error', { message: line });
        }

        // Bag detection status
        if (line.includes('Bag detected')) {
            this.emit('hardware:bag_detected', {});
        }
    }

    // Send dispense command to ESP32
    async dispense(grainType, weight) {
        if (!this.isConnected || !this.port) {
            throw new Error('ESP32 not connected');
        }

        if (this.isDispensing) {
            throw new Error('Already dispensing');
        }

        console.log(`[SerialService] Sending dispense command: Grain=${grainType}, Weight=${weight}g`);

        this.isDispensing = true;
        this.targetWeight = weight;
        this.currentWeight = 0;

        // Send grain selection (1 = Rice, 2 = Dal)
        await this.write(`${grainType}\n`);

        // Wait a bit for ESP32 to process
        await new Promise(resolve => setTimeout(resolve, 500));

        // Send target weight
        await this.write(`${weight}\n`);

        this.emit('hardware:dispensing_started', {
            grainType,
            targetWeight: weight
        });

        return { success: true, message: 'Dispensing started' };
    }

    // Write data to serial port
    async write(data) {
        return new Promise((resolve, reject) => {
            if (!this.port || !this.isConnected) {
                return reject(new Error('Port not connected'));
            }

            this.port.write(data, (err) => {
                if (err) {
                    console.error('[SerialService] Write error:', err);
                    reject(err);
                } else {
                    console.log('[SerialService] Sent:', data.trim());
                    resolve();
                }
            });
        });
    }

    // Disconnect from ESP32
    async disconnect() {
        if (this.port && this.port.isOpen) {
            await new Promise((resolve) => {
                this.port.close(() => {
                    console.log('[SerialService] Disconnected');
                    resolve();
                });
            });
        }
        this.isConnected = false;
        this.port = null;
        this.parser = null;
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            dispensing: this.isDispensing,
            currentWeight: this.currentWeight,
            targetWeight: this.targetWeight
        };
    }
}

// Singleton instance
const serialService = new SerialService();

module.exports = serialService;
