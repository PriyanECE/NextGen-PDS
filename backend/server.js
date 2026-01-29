const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Ensure path is required here
const fs = require('fs'); // Ensure fs is required here
const { spawn } = require('child_process');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Serve Uploads Static Folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Schemas
const BeneficiarySchema = new mongoose.Schema({
    name: String, // Head of Family
    age: Number, // Head Age
    gender: String, // Head Gender
    card: { type: String, unique: true },
    members: Number,
    status: { type: String, default: 'Active' },
    financialStatus: { type: String, enum: ['Above Poverty', 'Below Poverty'], default: 'Below Poverty' }, // New Field
    address: String, // Added
    image: { type: String, default: "" }, // New: Face Image for Head
    familyMembers: [{
        name: String,
        age: Number,
        gender: String, // New
        relation: String, // Head, Spouse, Child
        image: { type: String, default: "" } // New: Face Image for Member
    }],
    assignedShop: String, // Links to Employee.shopLocation
    assignedEmployee: String, // Auto-Assigned Employee Email
    rationStatus: {
        month: String, // e.g. "2024-01"
        isReceived: { type: Boolean, default: false },
        receivedDate: Date
    },
    specialRations: [{
        name: String,
        date: Date,
        description: String
    }]
});

const BeneficiaryRequestSchema = new mongoose.Schema({
    submissionDate: { type: Date, default: Date.now },
    submittedBy: String, // Employee Email
    status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected', 'ChangesRequested'] },
    requestType: { type: String, enum: ['NEW', 'UPDATE'], default: 'NEW' }, // New Field
    adminComments: String,
    data: {
        name: String,
        age: Number, // Head Age
        financialStatus: String, // New Field
        gender: String,
        card: { type: String }, // Removed unique: true to allow updates/history
        members: Number,
        image: String, // New
        familyMembers: [{
            name: String,
            age: Number,
            gender: String,
            relation: String,
            image: String // New
        }],
        assignedShop: String
    }
});

const EmployeeSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String, // In production, hash this!
    role: { type: String, default: 'employee' }, // 'manager' | 'employee'
    shopLocation: { type: String, default: 'Main Office' }, // New Field: Shop Location
    gender: { type: String, default: 'Other' }, // New Field: Gender
    status: { type: String, default: 'active', enum: ['active', 'pending_disable', 'disabled'] }, // New Field: Account Status
    image: { type: String, default: "" } // New: Face Image for Auth
});

const InventorySchema = new mongoose.Schema({
    type: { type: String, unique: true }, // 'daily_stock'
    rice: {
        total: { type: Number, default: 0 },
        dispensed: { type: Number, default: 0 }
    },
    dhal: {
        total: { type: Number, default: 0 },
        dispensed: { type: Number, default: 0 }
    },
    lastUpdated: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
    txnId: { type: String, unique: true }, // MATCH JSON: txnId
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    beneficiaryName: String,
    cardId: String,
    employeeEmail: String,
    items: [ // MATCH JSON: detailed items array
        {
            item: String,
            qty: Number,
            unit: String,
            price: Number
        }
    ],
    totalAmount: Number, // MATCH JSON: totalAmount
    authMode: String, // MATCH JSON: authMode (Biometric/OTP)
    paymentMode: { type: String, enum: ['Cash', 'UPI'], default: 'Cash' }, // New
    paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' }, // New
    dispenseStatus: { type: String, enum: ['Triggered', 'Success', 'Failed'], default: 'Triggered' }, // New
    status: { type: String, default: 'SUCCESS' },
    date: { type: Date, default: Date.now },
    location: String
});

const ShopSchema = new mongoose.Schema({
    code: { type: String, unique: true }, // e.g., 01AC001
    name: String,
    ownerName: String,
    address: String,
    tehsil: String,
    district: String,
    contactNumber: String
});

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);
const BeneficiaryRequest = mongoose.model('BeneficiaryRequest', BeneficiaryRequestSchema);
const Employee = mongoose.model('Employee', EmployeeSchema);
const Inventory = mongoose.model('Inventory', InventorySchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Shop = mongoose.model('Shop', ShopSchema);

// Routes

// --- PERSISTENT FACE SERVICE ---
class FaceService {
    constructor() {
        this.process = null;
        this.queue = []; // FIFO Queue for pending requests
        this.buffer = ''; // Buffer for incoming data
        this.start();
    }

    start() {
        console.log("[FaceService] Starting persistent Python process...");
        const scriptPath = path.join(__dirname, 'deepface_service.py');
        this.process = spawn('python', [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (data) => this.handleOutput(data));
        this.process.stderr.on('data', (data) => console.error(`[FaceService STDERR] ${data}`));

        this.process.on('close', (code) => {
            if (code !== 0 && code !== null) {
                console.error(`[FaceService] Process exited with code ${code}. Restarting in 1s...`);
                setTimeout(() => this.start(), 1000);
            }
        });

        this.process.on('error', (err) => {
            console.error(`[FaceService] Failed to start: ${err.message}`);
        });
    }

    handleOutput(data) {
        this.buffer += data.toString();
        // Split by newline, handle multiple JSON objects in one chunk
        let parts = this.buffer.split('\n');
        this.buffer = parts.pop(); // Keep the last incomplete part

        for (const line of parts) {
            if (!line.trim()) continue;
            try {
                const response = JSON.parse(line);

                // Handle initialization/status messages
                if (response.status) {
                    console.log(`[FaceService Status] ${response.message || response.error}`);
                    continue;
                }

                // Handle Verification Response
                const pending = this.queue.shift();
                if (pending) {
                    pending.resolve(response);
                } else {
                    console.warn("[FaceService] Received response efficiently but no pending request:", response);
                }

            } catch (e) {
                console.error("[FaceService] JSON Parse Error:", e.message, "Line:", line);
            }
        }
    }

    async verify(img1_path, img2_path) {
        return new Promise((resolve, reject) => {
            if (!this.process || this.process.killed) {
                return reject(new Error("FaceService is not running"));
            }

            // Push to queue
            this.queue.push({ resolve, reject });

            // Send to Python
            const payload = JSON.stringify({ img1_path, img2_path }) + '\n';
            this.process.stdin.write(payload);
        });
    }
}

const faceService = new FaceService();



// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Case insensitive email check
        const user = await Employee.findOne({
            email: email.toLowerCase()
        });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            res.json({
                success: true,
                user: {
                    name: user.name,
                    role: user.role,
                    email: user.email,
                    shopLocation: user.shopLocation
                }
            });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- EMPLOYEE FACE VERIFICATION ---
app.post('/api/auth/verify-employee-face', async (req, res) => {
    try {
        const { email, liveImage } = req.body;
        console.log(`[Auth] Face Verification Request for: ${email}`);

        if (!liveImage) return res.status(400).json({ success: false, message: "Live image required" });

        const user = await Employee.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (!user.image) {
            return res.status(400).json({ success: false, message: "No registered face found. Please contact Admin." });
        }

        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        // 1. Prepare Stored Image
        let storedImagePath = path.join(uploadsDir, `auth_stored_${user._id}.jpg`);
        try {
            let imgData = user.image;
            if (imgData.includes('uploads') || (imgData.includes('.jpg') && !imgData.startsWith('data:'))) {
                storedImagePath = path.isAbsolute(imgData) ? imgData : path.join(__dirname, imgData);
            } else {
                if (imgData.includes(",")) imgData = imgData.split(',')[1];
                fs.writeFileSync(storedImagePath, Buffer.from(imgData, 'base64'));
            }
        } catch (e) {
            console.error("Auth Stored Image Error:", e);
            return res.status(500).json({ success: false, message: "Failed to process stored image" });
        }

        // 2. Prepare Live Image
        let liveImagePath = path.join(uploadsDir, `auth_live_${user._id}.jpg`);
        try {
            let liveData = liveImage;
            if (liveData.includes(",")) liveData = liveData.split(',')[1];
            fs.writeFileSync(liveImagePath, Buffer.from(liveData, 'base64'));
        } catch (e) {
            console.error("Auth Live Image Error:", e);
            return res.status(500).json({ success: false, message: "Failed to process live image" });
        }

        // 3. Verify
        try {
            const result = await faceService.verify(storedImagePath, liveImagePath);
            console.log(`[Auth] Result for ${email}:`, result);

            if (fs.existsSync(liveImagePath)) fs.unlinkSync(liveImagePath);
            if (!user.image.includes('uploads') && !user.image.includes('.jpg')) {
                if (fs.existsSync(storedImagePath)) fs.unlinkSync(storedImagePath);
            }

            if (result.match) {
                res.json({
                    success: true,
                    message: "Face Verified",
                    confidence: result.confidence,
                    distance: result.distance
                });
            } else {
                res.json({
                    success: false,
                    message: "Face Mismatch",
                    confidence: result.confidence,
                    distance: result.distance
                });
            }
        } catch (err) {
            console.error("[Auth] Service Error:", err);
            res.status(500).json({ success: false, message: "Verification Service Failed" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- EMPLOYEES ---
app.get('/api/employees', async (req, res) => {
    try {
        const employees = await Employee.find({ role: 'employee' });
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NEW: Get All Shops
app.get('/api/shops', async (req, res) => {
    try {
        const shops = await Shop.find();
        res.json(shops);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/employees', async (req, res) => {
    try {
        // Use provided password or generate default: username + pds@123
        const emailLower = req.body.email.toLowerCase();
        let plainPassword = req.body.password;

        if (!plainPassword) {
            const emailPrefix = emailLower.split('@')[0];
            plainPassword = `${emailPrefix}pds@123`;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        const newEmp = await Employee.create({
            name: req.body.name,
            email: emailLower,
            role: 'employee',
            shopLocation: req.body.shopLocation || 'Main Office',
            gender: req.body.gender || 'Other',
            password: hashedPassword,
            image: req.body.image || "" // Save Face Image
        });
        res.json(newEmp);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/employees/request-disable', async (req, res) => {
    try {
        const { email } = req.body;
        await Employee.findOneAndUpdate({ email: email.toLowerCase() }, { status: 'pending_disable' });
        res.json({ success: true, message: "Disable Request Sent" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/employees/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await Employee.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Employee Details (Generic - e.g. shopLocation)
app.put('/api/employees/:id', async (req, res) => {
    try {
        const updates = req.body;
        const updated = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    try {
        await Employee.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Employee Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- INVENTORY ---
app.get('/api/inventory', async (req, res) => {
    try {
        let inv = await Inventory.findOne({ type: 'daily_stock' });
        if (!inv) {
            inv = await Inventory.create({
                type: 'daily_stock',
                rice: { total: 1000, dispensed: 0 },
                dhal: { total: 500, dispensed: 0 }
            });
        }
        res.json(inv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inventory/add', async (req, res) => {
    try {
        const { item, amount } = req.body; // item: 'rice' | 'dhal'
        const field = item.toLowerCase();

        if (!['rice', 'dhal'].includes(field)) return res.status(400).json({ error: "Invalid item" });

        const update = { $inc: {} };
        update.$inc[`${field}.total`] = amount;

        const inv = await Inventory.findOneAndUpdate(
            { type: 'daily_stock' },
            update,
            { new: true, upsert: true }
        );
        res.json(inv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BENEFICIARIES ---
app.get('/api/beneficiaries', async (req, res) => {
    try {
        const users = await Beneficiary.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.post('/api/beneficiaries/assign', async (req, res) => {
    try {
        const { employeeEmail, beneficiaryIds } = req.body;
        await Beneficiary.updateMany(
            { _id: { $in: beneficiaryIds } },
            { $set: { assignedEmployee: employeeEmail } }
        );
        res.json({ success: true, message: "Assigned successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/beneficiaries/:id', async (req, res) => {
    try {
        await Beneficiary.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Beneficiary Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BENEFICIARY REQUESTS (Employee -> Admin) ---

const RequestAuditLogSchema = new mongoose.Schema({
    requestId: String, // Link to original request
    actionDate: { type: Date, default: Date.now },
    action: String, // 'Created', 'Approved', 'Rejected', 'ChangesRequested'
    performedBy: String, // Email of user performing action
    comments: String,
    snapshotData: Object // Copy of the data at that time
});

// ... existing models ...
const RequestAuditLog = mongoose.model('RequestAuditLog', RequestAuditLogSchema);

// ... existing routes ...

// 1. Submit a new Request (Employee)
app.post('/api/beneficiary-requests', async (req, res) => {
    try {
        const { submittedBy, data, requestType = 'NEW' } = req.body;

        // Basic Check based on Request Type
        const exists = await Beneficiary.findOne({ card: data.card });

        if (requestType === 'NEW') {
            if (exists) return res.status(400).json({ error: "Card ID already exists in Active Database" });
        } else if (requestType === 'UPDATE') {
            if (!exists) return res.status(404).json({ error: "Card ID not found for Update" });
        }

        // Basic Check: Does request already exist? (Optional, based on Card ID)
        const pending = await BeneficiaryRequest.findOne({ 'data.card': data.card, status: 'Pending' });
        if (pending) return res.status(400).json({ error: "A pending request for this Card ID already exists" });

        const request = await BeneficiaryRequest.create({
            submittedBy,
            data,
            requestType,
            status: 'Pending'
        });

        // LOG TO HISTORY (Created)
        await RequestAuditLog.create({
            requestId: request._id,
            action: 'Created',
            performedBy: submittedBy,
            snapshotData: data
        });

        res.json(request);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Requests (Admin: All / Filter by Status; Employee: My Requests)
app.get('/api/beneficiary-requests', async (req, res) => {
    try {
        const { email, status } = req.query;
        let query = {};
        if (email) query.submittedBy = { $regex: new RegExp(`^${email.trim()}$`, 'i') };
        if (status) query.status = status;

        const requests = await BeneficiaryRequest.find(query).sort({ submissionDate: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NEW: Get Audit Logs
app.get('/api/request-audit-logs', async (req, res) => {
    try {
        const logs = await RequestAuditLog.find().sort({ actionDate: -1 }).limit(100); // Limit to last 100 for performance
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Admin Action (Approve / Deny / Review)
app.put('/api/beneficiary-requests/:id/status', async (req, res) => {
    try {
        const { status, adminComments } = req.body; // status: 'Approved', 'Rejected', 'ChangesRequested'
        const requestId = req.params.id;

        const request = await BeneficiaryRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: "Request not found" });

        if (status === 'Approved') {
            // Create the Real Beneficiary
            const benefData = request.data;
            const type = request.requestType || 'NEW';

            if (type === 'NEW') {
                const exists = await Beneficiary.findOne({ card: benefData.card });
                if (exists) return res.status(400).json({ error: "Cannot Approve: Card ID already exists in Active Database" });

                await Beneficiary.create({
                    ...benefData,
                    status: 'Active',
                    assignedEmployee: request.submittedBy // Or keep null/logic
                });
            } else if (type === 'UPDATE') {
                const updated = await Beneficiary.findOneAndUpdate(
                    { card: benefData.card },
                    { ...benefData, status: 'Active' }, // Ensure status stays active or updates if needed
                    { new: true }
                );
                if (!updated) return res.status(404).json({ error: "Original Beneficiary not found for update" });
            }

            request.status = 'Approved';
            request.adminComments = adminComments || "Approved by Admin";
        } else if (status === 'Rejected') {
            request.status = 'Rejected';
            request.adminComments = adminComments;
        } else if (status === 'ChangesRequested') {
            request.status = 'ChangesRequested';
            request.adminComments = adminComments;
        }

        await request.save();

        // LOG TO HISTORY (Action)
        await RequestAuditLog.create({
            requestId: request._id,
            action: status,
            performedBy: 'Admin', // Assuming Admin is the one calling this
            comments: adminComments,
            snapshotData: request.toObject().data // Ensure it's a plain object
        });

        res.json(request);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Monthly Ration (Manager Only)
app.post('/api/ration/reset', async (req, res) => {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        await Beneficiary.updateMany({}, {
            $set: {
                "rationStatus.month": currentMonth,
                "rationStatus.isReceived": false,
                "rationStatus.receivedDate": null
            }
        });
        res.json({ success: true, message: `Ration reset for ${currentMonth}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/beneficiaries/card/:cardId', async (req, res) => {
    try {
        const user = await Beneficiary.findOne({ card: req.params.cardId });
        if (!user) return res.status(404).json({ error: "Card not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Beneficiary Details
app.put('/api/beneficiaries/card/:cardId', async (req, res) => {
    try {
        const { cardId } = req.params;
        const updates = req.body;

        // Prevent modification of Card ID to avoid conflicts (or handle carefully if needed)
        delete updates.card;

        const updatedBeneficiary = await Beneficiary.findOneAndUpdate(
            { card: cardId },
            { $set: updates },
            { new: true }
        );

        if (!updatedBeneficiary) {
            return res.status(404).json({ error: "Beneficiary not found" });
        }

        res.json(updatedBeneficiary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FACE VERIFICATION ---
// fs is already declared at the top
// path is already declared at the top
// spawn is declared at the top

app.post('/api/verify-face', async (req, res) => {
    try {
        const { cardId, liveImage, memberId } = req.body;

        if (!liveImage) return res.status(400).json({ error: "Live image required" });

        const user = await Beneficiary.findOne({ card: cardId });
        if (!user) return res.status(404).json({ error: "Beneficiary not found" });

        // --- SIMPLE VERIFICATION ---
        console.log(`[Verify-Face] Check for ${cardId} (Member: ${memberId || 'HEAD'})`);

        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            console.log(`[Verify-Face] Creating missing uploads directory: ${uploadsDir}`);
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // 1. Prepare Stored Image
        let storedImagePath = path.join(uploadsDir, `stored_${cardId}_${memberId || 'HEAD'}.jpg`);
        try {
            let imgData = user.image; // Default to Head

            // If verifying a specific member
            if (memberId && memberId !== 'HEAD') {
                const member = user.familyMembers.find(m => m._id.toString() === memberId || m.name === memberId); // Support ID or Name match
                if (member && member.image) {
                    imgData = member.image;
                    console.log(`   -> Using Member Image: ${member.name}`);
                } else {
                    console.log("   -> Member image not found, falling back to HEAD or failing if critical");
                    // Decide behavior: fail or fallback? Let's fail if specific member requested but no image
                    if (member && !member.image) throw new Error(`No image for member ${member.name}`);
                }
            } else {
                console.log(`   -> Using Head of Family Image: ${user.name}`);
            }

            if (!imgData) throw new Error("User has no image data");

            // Check if it's a file path (from migration)
            if (imgData.includes('uploads') || (imgData.includes('.jpg') && !imgData.startsWith('data:'))) {
                // It's a path!
                // Resolve absolute path
                if (path.isAbsolute(imgData)) {
                    storedImagePath = imgData;
                } else {
                    storedImagePath = path.join(__dirname, imgData);
                }
                console.log(`   -> Using Existing Database Image File: ${storedImagePath}`);
            } else {
                // It's Base64
                if (imgData.includes(",")) {
                    imgData = imgData.split(',')[1];
                }
                fs.writeFileSync(storedImagePath, Buffer.from(imgData, 'base64'));
                console.log(`   -> Saved Database Image to ${storedImagePath}`);
            }
        } catch (e) {
            console.error("Failed to save DB image:", e);
            return res.status(400).json({
                error: "Invalid Database Image format",
                details: e.message,
                imgType: typeof imgData,
                imgLen: imgData ? imgData.length : 0,
                imgStart: imgData ? imgData.substring(0, 50) : "N/A"
            });
        }

        // 2. Prepare Live Image
        let liveImagePath = path.join(uploadsDir, `live_${cardId}.jpg`);
        try {
            let liveData = liveImage;
            if (!liveData) throw new Error("No live image data");

            if (liveData.includes(",")) {
                liveData = liveData.split(',')[1];
            }
            fs.writeFileSync(liveImagePath, Buffer.from(liveData, 'base64'));
            console.log(`   -> Saved Live Image to ${liveImagePath}`);
        } catch (e) {
            console.error("Failed to save Live image:", e);
            return res.status(400).json({ error: "Invalid Live Image format" });
        }

        // 3. Compare with DeepFace (VGG-Face) via Persistent Service
        console.log("[Verify-Face] Sending to Persistent Service...");

        // Ensure files exist before sending
        if (!fs.existsSync(storedImagePath) || !fs.existsSync(liveImagePath)) {
            return res.status(500).json({ success: false, error: "Image files failed to persist before verification" });
        }

        try {
            const result = await faceService.verify(storedImagePath, liveImagePath);
            console.log("[Verify-Face] Result:", result);

            // Cleanup
            try {
                // if (fs.existsSync(storedImagePath)) fs.unlinkSync(storedImagePath); // Don't delete stored if it's the source of truth, but here it's a copy if it was base64?
                // Actually `storedImagePath` might be the real file from DB.
                // Logic: 
                // If it was created from Base64 (line 654), we should delete it? 
                // Or if it's user.image path, we shouldn't.
                // For safety, let's NOT delete storedImagePath if it looks like a permanent uploads path (stored_...).
                // But the code above creates `stored_cardId_HEAD.jpg`.
                // If we treat it as cache, we can keep it? 
                // For now, let's keep the cleanup logic consistent with before OR strictly only clean up live image.
                // The previous code cleaned up ALL.
                if (fs.existsSync(storedImagePath)) fs.unlinkSync(storedImagePath);
                if (fs.existsSync(liveImagePath)) fs.unlinkSync(liveImagePath);
            } catch (cleanupErr) { console.error("Cleanup error:", cleanupErr); }

            res.json(result);
        } catch (err) {
            console.error("[Verify-Face] Service Error:", err);
            res.status(500).json({ error: "Verification Service Failed" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- DISPENSE ---
// --- DISPENSE & HARDWARE TRIGGER ---
app.post('/api/dispense', async (req, res) => {
    try {
        const { cardId, beneficiaryId, employeeEmail, items, totalAmount, paymentMode, authMode } = req.body;

        // 1. Update Inventory (Rice/Dhal Split)
        const updates = { $inc: {} };
        let hasUpdates = false;

        items.forEach(i => {
            if (i.item === 'Rice') {
                updates.$inc["rice.dispensed"] = (updates.$inc["rice.dispensed"] || 0) + (i.qty || 0);
                hasUpdates = true;
            }
            if (i.item === 'Dhal') {
                updates.$inc["dhal.dispensed"] = (updates.$inc["dhal.dispensed"] || 0) + (i.qty || 0);
                hasUpdates = true;
            }
        });

        if (hasUpdates) {
            await Inventory.findOneAndUpdate({ type: 'daily_stock' }, updates);
        }

        // 2. Update Beneficiary Ration Status
        const update = {
            "rationStatus.isReceived": true,
            "rationStatus.receivedDate": new Date()
        };
        await Beneficiary.findOneAndUpdate({ card: cardId }, { $set: update });

        // 3. Log Transaction
        const employee = await Employee.findOne({ email: employeeEmail?.toLowerCase() });
        const user = await Beneficiary.findOne({ card: cardId });

        const transactionLocation = employee ? employee.shopLocation : (user?.assignedShop || "Unknown Area");

        await Transaction.create({
            txnId: `TXN-${Date.now()}`,
            beneficiaryId: beneficiaryId,
            beneficiaryName: user?.name,
            cardId: cardId,
            employeeEmail: employeeEmail || "Unknown",
            items: items, // Save full detailed items
            totalAmount: totalAmount,
            authMode: authMode || 'FaceID',
            paymentMode: paymentMode || 'Cash',
            paymentStatus: 'Paid', // Assumed collected instantly
            dispenseStatus: 'Triggered',
            status: 'SUCCESS',
            location: transactionLocation
        });

        // 4. TRIGGER ESP32 (Hardware Integration)
        // Send command to ESP32 IP (Example: 192.168.4.1)
        // We use a fire-and-forget or short timeout approach
        try {
            // Mocking the call for now. In production, use axios/fetch to ESP32 IP.
            console.log(`📡 Sending Command to ESP32: Dispense ${JSON.stringify(items)}`);
            // await axios.post('http://192.168.4.1/control', { items });
        } catch (hwErr) {
            console.error("Hardware Trigger Failed:", hwErr.message);
            // We still return success to UI, but maybe log a warning
        }

        res.json({ success: true, message: "Dispense Logged & Hardware Triggered" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- REPORTS ---
app.get('/api/reports', async (req, res) => {
    try {
        console.log('API /reports called with query:', req.query); // DEBUG LOG
        const { employee, shop, sort, authMode, item } = req.query;
        let query = {};
        if (employee) {
            query.employeeEmail = { $regex: new RegExp(`^${employee.trim()}$`, 'i') };
        }
        if (shop) {
            query.location = { $regex: new RegExp(`^${shop.trim()}$`, 'i') };
        }
        if (authMode) {
            query.authMode = authMode;
        }
        if (item) {
            // Search inside the items array for a matching item name
            query['items.item'] = item;
        }

        // Sorting Logic
        let sortOption = { date: -1 }; // Default: Newest First
        if (sort === 'date_asc') sortOption = { date: 1 };
        if (sort === 'amount_desc') sortOption = { totalAmount: -1 };
        if (sort === 'amount_asc') sortOption = { totalAmount: 1 };

        const reports = await Transaction.find(query).sort(sortOption);
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SEEDING
const seedManager = async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123', salt);

    const exists = await Employee.findOne({ role: 'manager' });
    if (exists) {
        // Update password to hashed version to ensure login works
        exists.password = hashedPassword;
        await exists.save();
        console.log("✅ Updated Manager Password (Hashed)");
    } else {
        await Employee.create({
            name: 'Supervisor',
            email: 'admin@pds.com',
            password: hashedPassword,
            role: 'manager'
        });
        console.log("✅ Seeded Manager: admin@pds.com");
    }
};

const seedBeneficiaries = async () => {
    const count = await Beneficiary.countDocuments();
    if (count === 0) {
        await Beneficiary.insertMany([
            { name: "Ramesh Gupta", card: "RC-1001", members: 4, status: "Active", familyMembers: [] },
            { name: "Sita Devi", card: "RC-1002", members: 3, status: "Active", familyMembers: [] },
            { name: "Abdul Khan", card: "RC-1003", members: 5, status: "Active", familyMembers: [] }
        ]);
        console.log("✅ Seeded 3 Dummy Beneficiaries");
    }
};


const seedShops = async () => {
    const count = await Shop.countDocuments();
    if (count === 0) {
        console.log("🌱 Seeding Coimbatore FPS Data...");

        // Real Coimbatore Tehsils & Realistic Locations
        const shops = [
            // --- COIMBATORE NORTH ---
            { code: "12CN001", name: "Ganapathy Co-op", ownerName: "K. Palanisamy", address: "12, Sathy Road, Ganapathy", tehsil: "Coimbatore North", district: "Coimbatore", contactNumber: "9842200001" },
            { code: "12CN002", name: "Saravanampatti FPS", ownerName: "M. Velusamy", address: "45, Thudiyalur Rd, Saravanampatti", tehsil: "Coimbatore North", district: "Coimbatore", contactNumber: "9842200002" },
            { code: "12CN003", name: "Peelamedu Society", ownerName: "R. Krishnan", address: "88, Avinashi Rd, Peelamedu", tehsil: "Coimbatore North", district: "Coimbatore", contactNumber: "9842200003" },
            { code: "12CN004", name: "Gandhipuram Market", ownerName: "S. Murugan", address: "10,  Cross Cut Rd, Gandhipuram", tehsil: "Coimbatore North", district: "Coimbatore", contactNumber: "9842200004" },

            // --- COIMBATORE SOUTH ---
            { code: "12CS001", name: "Ramanathapuram FPS", ownerName: "P. Selvaraj", address: "22, Trichy Rd, Ramanathapuram", tehsil: "Coimbatore South", district: "Coimbatore", contactNumber: "9842200005" },
            { code: "12CS002", name: "Singanallur Unit", ownerName: "D. Ravi", address: "15, Kamarajar Rd, Singanallur", tehsil: "Coimbatore South", district: "Coimbatore", contactNumber: "9842200006" },
            { code: "12CS003", name: "Ukkadam Central", ownerName: "A. Mohamed", address: "33, Pollachi Main Rd, Ukkadam", tehsil: "Coimbatore South", district: "Coimbatore", contactNumber: "9842200007" },
            { code: "12CS004", name: "Town Hall Co-op", ownerName: "J. Suresh", address: "5, Big Bazaar St, Town Hall", tehsil: "Coimbatore South", district: "Coimbatore", contactNumber: "9842200008" },

            // --- POLLACHI ---
            { code: "12PO001", name: "Pollachi Market", ownerName: "K. Gounder", address: "100, Market Rd, Pollachi", tehsil: "Pollachi", district: "Coimbatore", contactNumber: "9842200009" },
            { code: "12PO002", name: "Mahalingapuram FPS", ownerName: "R. Natarajan", address: "12, Kovai Rd, Mahalingapuram", tehsil: "Pollachi", district: "Coimbatore", contactNumber: "9842200010" },
            { code: "12PO003", name: "Venkatesa Colony", ownerName: "S. Balan", address: "44, Palghat Rd, Pollachi", tehsil: "Pollachi", district: "Coimbatore", contactNumber: "9842200011" },

            // --- METTUPALAYAM ---
            { code: "12MT001", name: "Mettupalayam Main", ownerName: "V. Rangarajan", address: "55, Ooty Main Rd, Mettupalayam", tehsil: "Mettupalayam", district: "Coimbatore", contactNumber: "9842200012" },
            { code: "12MT002", name: "Karamadai FPS", ownerName: "P. Shanmugam", address: "22, Coimbatore Rd, Karamadai", tehsil: "Mettupalayam", district: "Coimbatore", contactNumber: "9842200013" },

            // --- SULUR ---
            { code: "12SU001", name: "Sulur Air Force", ownerName: "M. Kannan", address: "8, Kangeyam Rd, Sulur", tehsil: "Sulur", district: "Coimbatore", contactNumber: "9842200014" },
            { code: "12SU002", name: "Palladam Road Unit", ownerName: "R. Karthik", address: "15, Trichy Rd, Sulur", tehsil: "Sulur", district: "Coimbatore", contactNumber: "9842200015" },

            // --- VALPARAI ---
            { code: "12VP001", name: "Valparai Estate", ownerName: "D. Wilson", address: "40, Main Rd, Valparai", tehsil: "Valparai", district: "Coimbatore", contactNumber: "9842200016" },

            // --- PERUR ---
            { code: "12PE001", name: "Perur Temple Rd", ownerName: "S. Mani", address: "12, Siruvani Rd, Perur", tehsil: "Perur", district: "Coimbatore", contactNumber: "9842200017" },
            { code: "12PE002", name: "Thondamuthur FPS", ownerName: "K. Raju", address: "5, Narasipuram Rd, Thondamuthur", tehsil: "Perur", district: "Coimbatore", contactNumber: "9842200018" },

            // --- KINATHUKADAVU ---
            { code: "12KK001", name: "Kinathukadavu Main", ownerName: "M. Kandasamy", address: "88, Pollachi Rd, Kinathukadavu", tehsil: "Kinathukadavu", district: "Coimbatore", contactNumber: "9842200019" }
        ];

        await Shop.insertMany(shops);
        console.log("✅ Seeded 19 Realistic Coimbatore FPS Shops across 8 Tehsils");
    }
};

const runSeeds = async () => {
    await seedManager();
    await seedBeneficiaries();
    // await seedShops(); // DISABLED: Preserving manual Excel import
};
runSeeds();

// NEW: Transaction Reports Route
app.get('/api/reports', async (req, res) => {
    try {
        const { shop, sort, employee, authMode, item } = req.query;
        let query = {};

        if (shop) query.location = shop;
        if (employee) query.employeeEmail = { $regex: employee, $options: 'i' };
        if (authMode) query.authMode = authMode;
        if (item) query["items.item"] = item;

        let sortQuery = { date: -1 }; // Default: Newest first
        if (sort === 'date_asc') sortQuery = { date: 1 };
        if (sort === 'amount_desc') sortQuery = { totalAmount: -1 };
        if (sort === 'amount_asc') sortQuery = { totalAmount: 1 };

        const reports = await Transaction.find(query).sort(sortQuery).limit(500);
        res.json(reports);
    } catch (err) {
        console.error("Reports API Error:", err);
        res.status(500).json({ error: err.message });
    }
});
// --- AI ASSISTANT ---
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, language = 'en-US', role = 'employee' } = req.body;
        console.log(`[AI Chat] Message: "${message}", Lang: ${language}, Role: ${role}`);

        // 1. Gather Context
        const inventory = await Inventory.findOne({ type: 'daily_stock' });
        const shopCount = await Shop.countDocuments();
        const pendingRequests = await BeneficiaryRequest.countDocuments({ status: 'Pending' });

        const context = {
            inventory: inventory ? {
                rice: inventory.rice.total - inventory.rice.dispensed,
                dhal: inventory.dhal.total - inventory.dhal.dispensed
            } : { rice: 0, dhal: 0 },
            shops: shopCount,
            pending: pendingRequests
        };

        // 2. AI Logic (Gemini)
        if (process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const prompt = `
            You are the "Smart PDS" Assistant.
            
            [CONTEXT]
            - User Role: ${role}
            - Current Language Preference: ${language} (Strictly respond in this language)
            - Stock: Rice: ${context.inventory.rice}kg, Dhal: ${context.inventory.dhal}kg
            - Shops: ${context.shops}
            - Pending Requests: ${context.pending}

            You are the "Smart PDS Assistant", a highly intelligent multilingual voice assistant.
            
            [CRITICAL: LANGUAGE & SCRIPT]
            1. **DETECT LANGUAGE**: Identify the language of the User Query.
               - Supported: English, Tamil (தமிழ்), Hindi (हिंदी), Telugu (తెలుగు), Kannada (कन्नड़), Malayalam (മലയാളം).
            2. **RESPOND IN NATIVE SCRIPT**: 
               - If user speaks Tamil, reply in Tamil script (e.g. "வணக்கம், நான் எப்படி உதவ முடியும்?").
               - If user speaks Hindi, reply in Hindi script (e.g. "नमस्ते, मैं आपकी क्या सेवा कर सकता हूँ?").
               - If user speaks "Tanglish" or mixed, reply in mixed style but prioritize Native Script for formal entities.
            
            [ROLE ENFORCEMENT]
            - User Role: "${role}"
            - **ADMIN**: Access to /admin (Dashboard), /admin?tab=reports (Reports). BLOCKED from /scan, /add-beneficiary.
            - **EMPLOYEE**: Access to /scan, /history, /add-beneficiary. BLOCKED from /admin.
            
            [INTENT CLASSIFICATION]
            - If user wants to Navigate -> Return JSON {"action": "NAVIGATION", "target": "URL"}
            - If user wants to Click -> Return JSON {"action": "CLICK", "target": "ID"}
            - If user asks a Question -> Return JSON {"text": "Native answer"}

            [ROUTE & ACTION MAP]
            - "Home", "Main Menu", "Wapas": /home
            - "Scan", "Ration", "Distribute", "Next Customer": /scan (Employee Only)
            - "Add Member", "New Card", "Register": /add-beneficiary?mode=add (Employee Only)
            - "Update", "Edit", "Change Details": /add-beneficiary?mode=update (Employee Only)
            - "History", "Transactions", "Old Records": /history (Employee Only)
            - "Reports", "Sales Report", "Audit": /admin?tab=reports (Admin Only)
            - "Admin Panel", "Dashboard": /admin (Admin Only)
            - "Logout", "Sign out": CLICK "btn-logout"

            [STRICT RULES]
            - Do NOT hallucinate targets. Use ONLY the map above.
            - If Employee asks for Admin -> {"text": "Access Denied. You are an employee."}
            - If Admin asks for Scanner -> {"text": "Please use Employee login for scanning."}

            User Query: "${message}"
            Language Hint: User likely spoke in ${req.body.language || 'English'}
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Try parsing JSON actions
            try {
                const cleaned = text.replace(/```json|```/g, '').trim();
                if (cleaned.startsWith('{')) {
                    const jsonAction = JSON.parse(cleaned);
                    return res.json(jsonAction);
                }
            } catch (e) {
                // Not JSON, just text
            }

            return res.json({ text: text });
        }

        // 3. Fallback Logic (Keyword Matching) if no AI Key or Error
        const lower = message.toLowerCase();

        // FAILSAFE NAVIGATION (Works without AI)
        if (lower.includes('back') || lower.includes('return') || lower.includes('previous')) {
            return res.json({ action: "NAVIGATION", target: "BACK" });
        }

        // Employee Routes (Blocked for Admin)
        if (role !== 'admin') {
            if (lower.includes('history') || lower.includes('report') || lower.includes('transactions')) {
                return res.json({ action: "NAVIGATION", target: "/history?tab=transactions" });
            }
            if (lower.includes('request')) { // "my requests"
                return res.json({ action: "NAVIGATION", target: "/history?tab=requests" });
            }
            if ((lower.includes('next') && lower.includes('customer')) || lower.includes('scan') || lower.includes('qr') || lower.includes('camera')) {
                return res.json({ action: "NAVIGATION", target: "/scan" });
            }
            if (lower.includes('payment') || lower.includes('pay')) {
                return res.json({ action: "NAVIGATION", target: "/payment" });
            }
            if (lower.includes('register') || lower.includes('add') || lower.includes('beneficiary')) { // "add beneficiary"
                if (lower.includes('update') || lower.includes('edit') || lower.includes('change')) {
                    return res.json({ action: "NAVIGATION", target: "/add-beneficiary?mode=update" });
                }
                return res.json({ action: "NAVIGATION", target: "/add-beneficiary?mode=add" });
            }
        }

        // Admin Routes (Blocked for Employee)
        if (role === 'admin') {
            // Block Employee-only keywords
            if (lower.includes('history') || lower.includes('transactions')) {
                return res.json({ text: "Please use 'Reports' for admin history." });
            }
            if (lower.includes('report')) {
                return res.json({ action: "NAVIGATION", target: "/admin?tab=reports" });
            }
            if (lower.includes('admin') || lower.includes('dashboard') || lower.includes('stock')) {
                return res.json({ action: "NAVIGATION", target: "/admin" });
            }
        } else {
            // If employee asks for admin
            if (lower.includes('admin')) {
                return res.json({ text: "Access Denied. Admin only." });
            }
        }

        if (lower.includes('home') || lower.includes('menu')) {
            return res.json({ action: "NAVIGATION", target: "/home" });
        }
        if (lower.includes('help') || lower.includes('commands') || lower.includes('guide')) {
            return res.json({ action: "NAVIGATION", target: "/help" });
        }

        let reply = "I am the Smart PDS Assistant. (AI Offline)";

        if (language.startsWith('ta')) {
            if (lower.includes('rice') || lower.includes('அரிசி')) reply = `தற்போதைய அரிசி இருப்பு: ${context.inventory.rice} கிலோ.`;
            else if (lower.includes('shop') || lower.includes('கடை')) reply = `மொத்தம் ${context.shops} நியாய விலைக் கடைகள் உள்ளன.`;
            else reply = "மன்னிக்கவும், அரிசி அல்லது கடைகள் பற்றி கேட்கவும்.";
        } else {
            if (lower.includes('rice') || lower.includes('stock')) reply = `Current Rice Stock is ${context.inventory.rice} kg.`;
            else if (lower.includes('shop')) reply = `There are ${context.shops} active ration shops.`;
            else reply = "I can answer questions about Stock, Shops, or Navigate you.";
        }

        res.json({ text: reply });

    } catch (err) {
        console.error("AI Error:", err);
        res.status(500).json({ error: "AI Service Failed", details: err.message });
    }
});
// --- TTS PROXY ---
app.get('/api/tts', (req, res) => {
    try {
        const { text, lang } = req.query;
        console.log(`[TTS Proxy] Request for: "${text}" in ${lang}`);
        if (!text || !lang) return res.status(400).json({ error: "Text and lang required" });

        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang.split('-')[0]}&client=tw-ob`;

        const https = require('https');
        https.get(ttsUrl, (response) => {
            if (response.statusCode !== 200) {
                return res.status(response.statusCode).json({ error: "Upstream TTS failure" });
            }
            res.setHeader('Content-Type', 'audio/mpeg');
            response.pipe(res);
        }).on('error', (err) => {
            console.error("TTS Proxy Error:", err);
            res.status(500).json({ error: "Failed to fetch TTS" });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
