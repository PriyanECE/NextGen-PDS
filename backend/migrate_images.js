const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Define Schema Inline
const BeneficiarySchema = new mongoose.Schema({
    name: String,
    age: Number,
    gender: String,
    card: { type: String, unique: true },
    members: Number,
    status: { type: String, default: 'Active' },
    financialStatus: { type: String, enum: ['Above Poverty', 'Below Poverty'], default: 'Below Poverty' },
    address: String,
    image: { type: String, default: "" },
    familyMembers: [{
        name: String,
        age: Number,
        gender: String,
        relation: String,
        image: { type: String, default: "" }
    }],
    assignedShop: String,
    assignedEmployee: String,
    rationStatus: {
        month: String,
        isReceived: { type: Boolean, default: false },
        receivedDate: Date
    },
    specialRations: [{
        name: String,
        date: Date,
        description: String
    }]
});

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper: Save Base64 to File
const saveImageToFile = (base64Str, filename) => {
    try {
        if (!base64Str || base64Str.length < 100) return null; // Skip empty/short

        // Check if already a path
        if (base64Str.includes('uploads') || (base64Str.includes('.') && !base64Str.includes('data:'))) {
            return base64Str;
        }

        const data = base64Str.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(data, 'base64');
        const filePath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filePath, buffer);
        console.log(`✅ Saved: ${filename}`);
        return `uploads/${filename}`; // Return relative path
    } catch (e) {
        console.error(`❌ Failed to save ${filename}:`, e.message);
        return null; // Return null on failure so we don't corrupt DB
    }
};

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds').then(async () => {
    console.log("Connected to MongoDB for Migration...");
    try {
        const beneficiaries = await Beneficiary.find({});
        console.log(`Found ${beneficiaries.length} beneficiaries.`);

        for (const user of beneficiaries) {
            let modified = false;

            // 1. Process Head of Family
            if (user.image && user.image.startsWith('data:')) {
                const newPath = saveImageToFile(user.image, `${user.card}_head.jpg`);
                if (newPath) {
                    user.image = newPath;
                    modified = true;
                }
            }

            // 2. Process Family Members
            if (user.familyMembers && user.familyMembers.length > 0) {
                user.familyMembers.forEach((member, index) => {
                    if (member.image && member.image.startsWith('data:')) {
                        const newPath = saveImageToFile(member.image, `${user.card}_member_${index}.jpg`);
                        if (newPath) {
                            member.image = newPath;
                            modified = true;
                        }
                    }
                });
            }

            if (modified) {
                await user.save();
                console.log(`💾 Updated DB for ${user.card}`);
            } else {
                console.log(`- No changes for ${user.card}`);
            }
        }
        console.log("Migration Complete.");

    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
}).catch(err => {
    console.error("Connection Error:", err);
    process.exit(1);
});
