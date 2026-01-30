const mongoose = require('mongoose');
require('dotenv').config();

const shopSchema = new mongoose.Schema({ code: String, name: String });
const Shop = mongoose.model('Shop', shopSchema);

const checkDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/smart-pds');
        const count = await Shop.countDocuments();
        console.log(`Current Shop Count: ${count}`);
        if (count > 0) {
            const sample = await Shop.findOne();
            console.log("Sample Shop:", sample);
        }
    } catch (err) { console.error(err); }
    mongoose.disconnect();
};
checkDB();
