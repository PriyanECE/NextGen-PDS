const mongoose = require('mongoose');
require('dotenv').config();

const BeneficiarySchema = new mongoose.Schema({
    name: String,
    card: String,
    image: String
});
const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds').then(async () => {
    const user = await Beneficiary.findOne({ card: 'TN-722824106123' });
    console.log("User Image Field:", user ? user.image : "User Not Found");
    process.exit();
});
