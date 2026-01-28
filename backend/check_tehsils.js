const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

const ShopSchema = new mongoose.Schema({ tehsil: String }, { strict: false });
const Shop = mongoose.model('Shop', ShopSchema);

const checkTehsils = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        const tehsils = await Shop.distinct('tehsil');
        console.log('✅ DB Tehsils:', tehsils.sort());
    } catch (err) {
        console.log(err);
    } finally {
        await mongoose.disconnect();
    }
};

checkTehsils();
