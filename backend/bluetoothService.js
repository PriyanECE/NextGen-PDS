const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class BluetoothHardwareService {
    constructor() {
        this.port = null;
        this.parser = null;
        this.isConnected = false;
        this.currentWeight = 0;
        this.targetWeight = 0;
        this.isDispensing = false;
        this.eventEmitter = null;
        this.portName = null;
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

    // List available serial ports
    static async listPorts() {
        try {
            const ports = await SerialPort.list();
            return ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer,
                serialNumber: port.serialNumber,
                friendlyName: port.friendlyName || port.path
            }));
        } catch (err) {
            console.error('[BluetoothService] Error listing ports:', err.message);
            return [];
        }
    }

    // Connect to ESP32 via Bluetooth Serial
    async connect(portName) {
        try {
            console.log(`[BluetoothService] Connecting to ${portName}...`);

            this.port = new SerialPort({
                path: portName,
                baudRate: 115200,
                autoOpen: false
            });

            // Setup line parser
            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

            // Handle incoming data
            this.parser.on('data', (line) => {
                try {
                    const data = JSON.parse(line.trim());
                    this.handleResponse(data);
                } catch (err) {
                    console.log('[BluetoothService] Non-JSON data:', line);
                }
            });

            // Handle errors
            this.port.on('error', (err) => {
                console.error('[BluetoothService] Port error:', err.message);
                this.disconnect();
            });

            // Handle disconnect
            this.port.on('close', () => {
                console.log('[BluetoothService] Port closed');
                this.isConnected = false;
                this.emit('hardware:disconnected', {});
            });

            // Open port
            await new Promise((resolve, reject) => {
                this.port.open((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            this.isConnected = true;
            this.portName = portName;
            console.log('[BluetoothService] ✅ Connected via Bluetooth');

            this.emit('hardware:connected', { port: portName });

            // Request initial status
            this.sendCommand({ cmd: 'status' });

            return { success: true, port: portName };

        } catch (err) {
            console.error('[BluetoothService] Connection failed:', err.message);
            this.isConnected = false;
            throw err;
        }
    }

    // Send command to ESP32
    sendCommand(cmd) {
        if (!this.isConnected || !this.port) {
            throw new Error('Bluetooth not connected');
        }

        const json = JSON.stringify(cmd);
        this.port.write(json + '\n', (err) => {
            if (err) {
                console.error('[BluetoothService] Write error:', err.message);
            }
        });
    }

    // Handle responses from ESP32
    handleResponse(data) {
        const type = data.type;

        if (type === 'weight_update') {
            this.currentWeight = data.weight || 0;
            this.isDispensing = data.dispensing || false;
            this.targetWeight = data.target || 0;

            // Emit weight update
            this.emit('hardware:weight', {
                current: this.currentWeight,
                target: this.targetWeight,
                progress: this.targetWeight > 0 ? (this.currentWeight / this.targetWeight) * 100 : 0
            });

        } else if (type === 'status') {
            this.currentWeight = data.weight || 0;
            this.isDispensing = data.dispensing || false;
            this.targetWeight = data.target || 0;

        } else if (type === 'dispense_complete') {
            this.isDispensing = false;
            this.emit('hardware:complete', {
                finalWeight: data.finalWeight,
                targetWeight: data.targetWeight
            });
            console.log('[BluetoothService] ✅ Dispense Complete');

        } else if (type === 'tare') {
            console.log('[BluetoothService] ✅ Tare Complete');
            this.currentWeight = 0;
            this.emit('hardware:weight', { current: 0, target: 0, status: 'idle' });

        } else if (type === 'error') {
            console.error('[BluetoothService] ESP32 Error:', data.message);
        }
    }

    // Send dispense command
    async dispense(grainType, weight) {
        if (!this.isConnected) {
            throw new Error('Bluetooth not connected');
        }

        if (this.isDispensing) {
            throw new Error('Already dispensing');
        }

        console.log(`[BluetoothService] Sending dispense: Grain=${grainType}, Weight=${weight}g`);

        this.sendCommand({
            cmd: 'dispense',
            grainType: grainType,
            weight: weight
        });

        this.isDispensing = true;
        this.targetWeight = weight;

        this.emit('hardware:dispensing_started', {
            grainType,
            targetWeight: weight
        });

        return { success: true, message: 'Dispensing started' };
    }

    // Manual Tare Command
    async tare() {
        if (!this.isConnected) {
            throw new Error('Bluetooth not connected');
        }

        console.log('[BluetoothService] Sending TARE command');
        this.sendCommand({ cmd: 'tare' });
        return { success: true };
    }

    // Stop dispensing
    async stop() {
        if (!this.isConnected) {
            throw new Error('Bluetooth not connected');
        }

        console.log('[BluetoothService] Sending STOP command');
        this.sendCommand({ cmd: 'stop' });
        this.isDispensing = false;
        return { success: true };
    }

    // Disconnect
    async disconnect() {
        if (this.port && this.port.isOpen) {
            this.port.close();
        }

        this.isConnected = false;
        this.portName = null;
        console.log('[BluetoothService] Disconnected');
        this.emit('hardware:disconnected', {});
    }

    // Get current status
    getStatus() {
        return {
            connected: this.isConnected,
            port: this.portName,
            dispensing: this.isDispensing,
            currentWeight: this.currentWeight,
            targetWeight: this.targetWeight
        };
    }
}

// Singleton instance
const bluetoothService = new BluetoothHardwareService();

module.exports = bluetoothService;
