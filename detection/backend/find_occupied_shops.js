const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

const BeneficiarySchema = new mongoose.Schema({ assignedShop: String }, { strict: false });

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);

const findOccupiedShops = async () => {
    try {
        await mongoose.connect(MONGO_URI);

        // Find all distinct assignedShop values
        const shopNames = await Beneficiary.distinct('assignedShop');
        console.log('✅ Shops with beneficiaries:', shopNames);
        console.log('Count:', shopNames.length);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

findOccupiedShops();
