const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

// Loose schema to allow inspection
const TransactionSchema = new mongoose.Schema({}, { strict: false });
const Transaction = mongoose.model('Transaction', TransactionSchema);

const checkData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const allTxns = await Transaction.find();
        console.log(`Checking ${allTxns.length} transactions...`);

        let badCount = 0;
        let deletedCount = 0;

        for (const txn of allTxns) {
            // Check if items is NOT an array
            if (txn.items && !Array.isArray(txn.items)) {
                console.log(`❌ Found bad record: ${txn._id}`);
                console.log(`   Items: ${JSON.stringify(txn.items)}`);

                // Fix or Delete? Let's delete to be safe.
                await Transaction.deleteOne({ _id: txn._id });
                deletedCount++;
                badCount++;
            }
        }

        if (badCount === 0) {
            console.log("✅ All transaction 'items' fields are arrays.");
        } else {
            console.log(`⚠️ Removed ${deletedCount} bad transactions.`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

checkData();
