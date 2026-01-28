const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

const ShopSchema = new mongoose.Schema({ code: String, name: String }, { strict: false });
const Shop = mongoose.model('Shop', ShopSchema);

const checkCodes = async () => {
    try {
        await mongoose.connect(MONGO_URI);

        const testCodes = ['31GP172PN', '31ED007PN', '31GP090PN']; // From JSON
        const shops = await Shop.find({ code: { $in: testCodes } });

        console.log(`Found ${shops.length} matching shops out of ${testCodes.length} tested.`);
        shops.forEach(s => console.log(` - Matched: ${s.code} -> ${s.name}`));

        if (shops.length === 0) {
            console.log("No partial matches. Enumerating first 5 DB codes to compare format:");
            const sampleShops = await Shop.find().limit(5);
            sampleShops.forEach(s => console.log(`   DB Code: ${s.code}`));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

checkCodes();
