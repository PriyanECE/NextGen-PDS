const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- Configuration ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';
const JSON_FILE_PATH = path.join(__dirname, '../tn_smartcard_beneficiaries_5000_allshops.json');

// --- Schemas (Must match server.js) ---
const BeneficiarySchema = new mongoose.Schema({
    name: String,
    gender: String,
    card: { type: String, unique: true },
    members: Number,
    status: { type: String, default: 'Active' },
    familyMembers: [{
        name: String,
        age: Number,
        gender: String, // Note: server.js has this
        relation: String
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

const ShopSchema = new mongoose.Schema({
    code: String,
    name: String,
    tehsil: String,
    district: String
});

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);
const Shop = mongoose.model('Shop', ShopSchema);

const importBeneficiaries = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Clear Existing Data
        console.log('🧹 Clearing existing beneficiaries...');
        await Beneficiary.deleteMany({});
        console.log('✅ Cleared old beneficiaries.');

        // 2. Load Shops
        const shops = await Shop.find();
        console.log(`ℹ️ Loaded ${shops.length} shops.`);

        if (shops.length === 0) {
            console.error('❌ No shops found in DB! Please run shop import first.');
            process.exit(1);
        }

        // Create a fast lookup map for shops by code
        const shopMap = new Map(); // code -> shop object
        shops.forEach(s => shopMap.set(s.code, s));

        // 3. Read JSON
        console.log(`Reading JSON file: ${JSON_FILE_PATH}`);
        const rawData = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
        const beneficiariesData = JSON.parse(rawData);
        console.log(`ℹ️ Parsed ${beneficiariesData.length} records from JSON.`);

        // 4. Transform & Assign
        let exactMatches = 0;
        let randomAssignments = 0;
        const batchSize = 1000;
        let processedCount = 0;

        const allBeneficiaries = beneficiariesData.map(b => {
            // Logic: Try to match by Ration Shop Code
            let targetShop = shopMap.get(b.rationShopId);

            if (targetShop) {
                exactMatches++;
            } else {
                // Determine eligible shops based on basic logic or fully random
                // Since we don't have a reliable Taluk map for these codes, we'll randomize among ALL shops
                // to ensure they get assigned SOMEWHERE valid.
                targetShop = shops[Math.floor(Math.random() * shops.length)];
                randomAssignments++;
            }

            return {
                name: b.headOfFamily.name,
                gender: b.headOfFamily.gender,
                card: b.smartCardNo,
                members: b.members.length,
                status: 'Active',
                familyMembers: b.members.map(m => ({
                    name: m.name,
                    age: m.age,
                    gender: m.gender,
                    relation: m.relation
                })),
                assignedShop: targetShop.name, // Link by Name as per schema
                assignedEmployee: null, // Will be assigned later
                rationStatus: {
                    month: new Date().toISOString().slice(0, 7),
                    isReceived: false
                }
            };
        });

        // 5. Insert in Batches
        console.log(`🚀 Starting bulk insert of ${allBeneficiaries.length} records...`);
        for (let i = 0; i < allBeneficiaries.length; i += batchSize) {
            const batch = allBeneficiaries.slice(i, i + batchSize);
            await Beneficiary.insertMany(batch, { ordered: false });
            processedCount += batch.length;
            console.log(`   - Inserted ${processedCount} / ${allBeneficiaries.length}`);
        }

        console.log('------------------------------------------------');
        console.log(`✅ Import Complete!`);
        console.log(`   Total Records: ${allBeneficiaries.length}`);
        console.log(`   Exact Shop Code Matches: ${exactMatches}`);
        console.log(`   Random Assignments: ${randomAssignments}`);
        console.log('------------------------------------------------');

    } catch (err) {
        console.error('❌ Import Failed:', err);
    } finally {
        await mongoose.disconnect();
    }
};

importBeneficiaries();
