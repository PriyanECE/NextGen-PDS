const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- Configuration ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';
// Note: File name matches what user provided
const JSON_FILE_PATH = path.join(__dirname, '../tn_smartcard_beneficiaries_1000_coimb_shops.json');

// --- Schemas ---
const BeneficiarySchema = new mongoose.Schema({
    name: String,
    gender: String,
    card: { type: String, unique: true },
    members: Number,
    status: { type: String, default: 'Active' },
    familyMembers: [{
        name: String,
        age: Number,
        gender: String,
        relation: String
    }],
    assignedShop: String, // Storing Shop Name to match UI logic
    assignedEmployee: String,
    rationStatus: {
        month: String,
        isReceived: { type: Boolean, default: false },
        receivedDate: Date
    },
    // Optional fields from new JSON can be stored or ignored. using schema strict: false for flexibility during transition or defining explicitly
});

const ShopSchema = new mongoose.Schema({
    code: String,
    name: String,
    tehsil: String
});

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);
const Shop = mongoose.model('Shop', ShopSchema);

const importBeneficiaries = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Clear Old Data
        console.log('🧹 Clearing existing beneficiaries...');
        await Beneficiary.deleteMany({});
        console.log('✅ Cleared old beneficiaries.');

        // 2. Load Shops & Index by Code
        console.log('📥 Loading Shops...');
        const shops = await Shop.find();
        const shopMap = {}; // code -> shopName
        shops.forEach(s => {
            if (s.code) shopMap[s.code] = s.name;
        });
        console.log(`ℹ️ Indexed ${Object.keys(shopMap).length} shops by code.`);

        // 3. Read JSON
        console.log('📖 Reading JSON file...');
        if (!fs.existsSync(JSON_FILE_PATH)) {
            throw new Error(`File not found: ${JSON_FILE_PATH}`);
        }
        const rawData = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
        const beneficiariesData = JSON.parse(rawData);
        console.log(`ℹ️ Found ${beneficiariesData.length} records.`);

        // 4. Map & Transform
        let matchedCount = 0;
        let missingShopCount = 0;

        const newBeneficiaries = beneficiariesData.map(b => {
            // Match logic
            const shopCode = b.rationShopId;
            const shopName = shopMap[shopCode];

            if (shopName) matchedCount++;
            else missingShopCount++;

            // Transform Schema
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
                assignedShop: shopName || null, // null if no match found
                assignedEmployee: null,
                rationStatus: {
                    month: new Date().toISOString().slice(0, 7),
                    isReceived: false
                }
            };
        });

        // 5. Insert
        // Filter out those without assigned shops if we want strict integrity, 
        // OR keep them as unassigned. User asked to "add accordingly", usually implies keeping data.
        // Let's keep them but log the count.
        console.log(`📝 Prepared ${newBeneficiaries.length} documents.`);
        console.log(`   ✅ Matched Shops: ${matchedCount}`);
        console.log(`   ⚠️ No Shop Match: ${missingShopCount}`);

        const result = await Beneficiary.insertMany(newBeneficiaries, { ordered: false });
        console.log(`✅ Successfully inserted ${result.length} beneficiaries.`);

    } catch (err) {
        console.error('❌ Import Failed:', err);
    } finally {
        await mongoose.disconnect();
    }
};

importBeneficiaries();
