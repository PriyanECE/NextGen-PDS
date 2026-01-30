const express = require('express');
const router = express.Router();
const wifiService = require('../wifiService');
const bluetoothService = require('../bluetoothService');
const { SerialPort } = require('serialport');

// Current active service ('wifi' or 'bluetooth')
let activeService = null;
let currentServiceType = null;

// Get current hardware service
function getHardwareService() {
    if (!activeService) {
        throw new Error('No hardware service connected');
    }
    return activeService;
}

// List available Bluetooth ports
router.get('/bluetooth/ports', async (req, res) => {
    try {
        const ports = await bluetoothService.constructor.listPorts();
        res.json({ success: true, ports });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Connect via Bluetooth
router.post('/bluetooth/connect', async (req, res) => {
    try {
        const { port } = req.body;

        if (!port) {
            return res.status(400).json({ error: 'Port name required' });
        }

        // Disconnect existing service
        if (activeService) {
            await activeService.disconnect();
        }

        const result = await bluetoothService.connect(port);
        activeService = bluetoothService;
        currentServiceType = 'bluetooth';

        res.json({ success: true, type: 'bluetooth', ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Connect via WiFi
router.post('/wifi/connect', async (req, res) => {
    try {
        const { ip } = req.body;

        if (!ip) {
            return res.status(400).json({ error: 'IP address required' });
        }

        // Disconnect existing service
        if (activeService) {
            await activeService.disconnect();
        }

        const result = await wifiService.connect(ip);
        activeService = wifiService;
        currentServiceType = 'wifi';

        res.json({ success: true, type: 'wifi', ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get hardware status
router.get('/status', (req, res) => {
    try {
        const service = getHardwareService();
        const status = service.getStatus();
        res.json({ success: true, type: currentServiceType, ...status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dispense command
router.post('/dispense', async (req, res) => {
    try {
        const service = getHardwareService();
        const { grainType, weight } = req.body;

        if (!grainType || !weight) {
            return res.status(400).json({ error: 'grainType and weight required' });
        }

        const result = await service.dispense(grainType, weight);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tare command
router.post('/tare', async (req, res) => {
    try {
        const service = getHardwareService();
        const result = await service.tare();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stop command
router.post('/stop', async (req, res) => {
    try {
        const service = getHardwareService();

        // Check if service has stop method
        if (typeof service.stop === 'function') {
            const result = await service.stop();
            res.json(result);
        } else {
            res.json({ success: true, message: 'Stop not supported by current service' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Disconnect
router.post('/disconnect', async (req, res) => {
    try {
        if (activeService) {
            await activeService.disconnect();
            activeService = null;
            currentServiceType = null;
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// WiFi-specific register endpoint (for ESP32 auto-registration)
router.post('/register', (req, res) => {
    const { ip, type } = req.body;
    console.log(`[Hardware] ESP32 registered: ${ip} (${type})`);
    res.json({ success: true });
});

module.exports = router;
