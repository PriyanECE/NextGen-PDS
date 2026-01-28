const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- Configuration ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';
const JSON_FILE_PATH = path.join(__dirname, '../transactions_5_per_shop_allshops.json');

// --- Schemas (Must match server.js updates) ---
// Minimal schemas needed for linking
const TransactionSchema = new mongoose.Schema({
    txnId: { type: String, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    beneficiaryName: String,
    cardId: String,
    employeeEmail: String,
    items: [
        {
            item: String,
            qty: Number,
            unit: String,
            price: Number
        }
    ],
    totalAmount: Number,
    authMode: String,
    status: { type: String, default: 'SUCCESS' },
    date: { type: Date, default: Date.now },
    location: String
});

const BeneficiarySchema = new mongoose.Schema({
    card: String,
    name: String,
    assignedShop: String
});

const ShopSchema = new mongoose.Schema({
    code: String,
    name: String
});

const Transaction = mongoose.model('Transaction', TransactionSchema);
const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);
const Shop = mongoose.model('Shop', ShopSchema);

const importTransactions = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Clear Existing Transactions
        console.log('🧹 Clearing existing transactions...');
        await Transaction.deleteMany({});
        console.log('✅ Cleared old transactions.');

        // 2. Load Lookups (Beneficiaries & Shops)
        console.log('ℹ️ Loading lookup data...');
        const beneficiaries = await Beneficiary.find().select('card name assignedShop');
        const shops = await Shop.find().select('code name');

        const benMap = new Map(); // card -> { _id, name, assignedShop }
        beneficiaries.forEach(b => benMap.set(b.card, b));

        const shopMap = new Map(); // code -> name
        shops.forEach(s => shopMap.set(s.code, s.name));

        console.log(`ℹ️ Loaded ${beneficiaries.length} beneficiaries and ${shops.length} shops.`);

        // 3. Read JSON
        console.log(`Reading JSON file: ${JSON_FILE_PATH}`);
        const rawData = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
        const transactionsData = JSON.parse(rawData);
        console.log(`ℹ️ Parsed ${transactionsData.length} records from JSON.`);

        // 4. Transform
        const batchSize = 1000;
        let processedCount = 0;
        let missingBenCount = 0;

        const allTransactions = transactionsData.map(t => {
            const ben = benMap.get(t.smartCardNo);
            const shopName = shopMap.get(t.rationShopId) || t.rationShopId; // Fallback to code if name not found

            if (!ben) missingBenCount++;

            return {
                txnId: t.txnId,
                beneficiaryId: ben ? ben._id : null,
                beneficiaryName: ben ? ben.name : 'Unknown User',
                cardId: t.smartCardNo,
                employeeEmail: 'system_import@pds.com', // Placeholder for historical data
                items: t.items, // Direct mapping: [{item, qty, unit, price}]
                totalAmount: t.totalAmount,
                authMode: t.authMode,
                status: t.status,
                date: new Date(t.date),
                location: shopName
            };
        });

        // 5. Insert
        console.log(`🚀 Starting bulk insert...`);
        for (let i = 0; i < allTransactions.length; i += batchSize) {
            const batch = allTransactions.slice(i, i + batchSize);
            await Transaction.insertMany(batch, { ordered: false });
            processedCount += batch.length;
            console.log(`   - Inserted ${processedCount} / ${allTransactions.length}`);
        }

        console.log('------------------------------------------------');
        console.log(`✅ Transaction Import Complete!`);
        console.log(`   Total Imported: ${allTransactions.length}`);
        console.log(`   Missing Beneficiaries: ${missingBenCount} (Transactions kept generic)`);
        console.log('------------------------------------------------');

    } catch (err) {
        console.error('❌ Import Failed:', err);
    } finally {
        await mongoose.disconnect();
    }
};

importTransactions();
