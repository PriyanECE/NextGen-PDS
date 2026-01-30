const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

const TransactionSchema = new mongoose.Schema({ location: String, items: Array, totalAmount: Number }, { strict: false });
const Transaction = mongoose.model('Transaction', TransactionSchema);

const checkLocations = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // unique locations
        const locations = await Transaction.distinct('location');
        console.log('\n--- Transaction Locations ---');
        locations.forEach(l => console.log(`'${l}'`));

        // Sample one txn
        const one = await Transaction.findOne();
        console.log('\n--- Sample Transaction ---');
        console.log(JSON.stringify(one, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

checkLocations();
