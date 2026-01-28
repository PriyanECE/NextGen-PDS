const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- Configuration ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';
const JSON_FILE_PATH = path.join(__dirname, '../beneficiaries_100.json');

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
    assignedShop: String,
    assignedEmployee: String,
    rationStatus: {
        month: String,
        isReceived: { type: Boolean, default: false },
        receivedDate: Date
    },
    specialRations: [{ // Defined in schema but optional
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

// --- Mapping Logic ---
// JSON Taluk -> Possible DB Tehsils
const TEHSIL_MAP = {
    'Pollachi': ['Pollachi (Tk)'],
    'Mettupalayam': ['Mettupalayam (Tk)'],
    'Coimbatore South': ['Madhukkaraitk)', 'Perur(tk)', 'Kinathukaduvu  {Tk)', 'Sulur'], // South/Central regions
    'Coimbatore North': ['Annur', 'Perur(tk)', 'Mettupalayam (Tk)'], // North regions
    // Default fallback
    'DEFAULT': ['Pollachi (Tk)', 'Valparai (Tk)', 'Anaimalai(tk)']
};

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

        // 3. Read JSON
        const rawData = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
        const beneficiariesData = JSON.parse(rawData);
        console.log(`ℹ️ Processing ${beneficiariesData.length} beneficiaries...`);

        // 4. Assign & Transform
        const newBeneficiaries = beneficiariesData.map(b => {
            const jsonTaluk = b.taluk || 'Coimbatore South'; // Default if missing

            // Determine eligible Tehsils
            let targetTehsils = TEHSIL_MAP[jsonTaluk] || TEHSIL_MAP['DEFAULT'];

            // Filter shops matching these Tehsils
            let eligibleShops = shops.filter(s => targetTehsils.includes(s.tehsil));

            // Fallback if no specific match found (should be rare given the map)
            if (eligibleShops.length === 0) {
                eligibleShops = shops;
            }

            // Pick Random Shop from Eligible List
            const randomShop = eligibleShops[Math.floor(Math.random() * eligibleShops.length)];

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
                assignedShop: randomShop.name, // Link by Name
                assignedEmployee: null,
                rationStatus: {
                    month: new Date().toISOString().slice(0, 7),
                    isReceived: false
                }
            };
        });

        // 5. Insert
        const result = await Beneficiary.insertMany(newBeneficiaries, { ordered: false });
        console.log(`✅ Successfully imported ${result.length} beneficiaries with location-aware assignment.`);

        // 6. Debug Output
        console.log('\n--- Assignment Sample ---');
        newBeneficiaries.slice(0, 5).forEach((b, i) => {
            console.log(`${i + 1}. ${b.name} (${beneficiariesData[i].taluk}) -> Assigned: ${b.assignedShop}`);
        });

    } catch (err) {
        console.error('❌ Import Failed:', err);
    } finally {
        await mongoose.disconnect();
    }
};

importBeneficiaries();
