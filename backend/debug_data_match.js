const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

// Schemas (simplified for reading)
const BeneficiarySchema = new mongoose.Schema({ assignedShop: String }, { strict: false });
const ShopSchema = new mongoose.Schema({ name: String, code: String }, { strict: false });

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);
const Shop = mongoose.model('Shop', ShopSchema);

const debugData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        const sampleBeneficiary = await Beneficiary.findOne({ assignedShop: { $exists: true } });
        console.log('Sample Beneficiary assignedShop:', sampleBeneficiary ? sampleBeneficiary.assignedShop : 'NONE');

        if (sampleBeneficiary) {
            const matchingShop = await Shop.findOne({ name: sampleBeneficiary.assignedShop });
            console.log('Matching Shop found in DB?', matchingShop ? 'YES' : 'NO');
            if (matchingShop) console.log('Shop Details:', matchingShop);

            // detailed check
            const count = await Beneficiary.countDocuments();
            console.log('Total Beneficiaries:', count);
        }

        const shopSample = await Shop.findOne();
        console.log('Sample Shop Name:', shopSample ? shopSample.name : 'NONE');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

debugData();
