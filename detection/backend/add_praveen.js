
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        insertBeneficiary();
    })
    .catch(err => {
        console.error('❌ Connection Error:', err);
        process.exit(1);
    });

const BeneficiarySchema = new mongoose.Schema({
    name: String,
    age: Number,
    gender: String,
    card: { type: String, unique: true },
    members: Number,
    status: { type: String, default: 'Active' },
    address: String,
    image: { type: String, default: "" },
    assignedShop: String,
    familyMembers: [{
        name: String,
        age: Number,
        gender: String,
        relation: String,
        image: { type: String, default: "" }
    }]
});

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);

async function insertBeneficiary() {
    try {
        const beneficiaryData = {
            name: "Praveen Kanth",
            age: 19,
            gender: "Male",
            card: "TN-722824106120",
            members: 1,
            status: "Active",
            address: "Anaimalai",
            image: "D:\\PDS\\images\\Praveen Kanth.jpeg",
            assignedShop: "Anaimalai - 1", // Matches standard shop format
            familyMembers: [
                {
                    name: "Praveen Kanth",
                    age: 19,
                    gender: "Male",
                    relation: "Head",
                    image: "D:\\PDS\\images\\Praveen Kanth.jpeg"
                }
            ]
        };

        // Check if exists
        const exists = await Beneficiary.findOne({ card: beneficiaryData.card });
        if (exists) {
            console.log('⚠️ Beneficiary with this card already exists. Updating...');
            await Beneficiary.updateOne({ card: beneficiaryData.card }, beneficiaryData);
            console.log('✅ Beneficiary Updated:', beneficiaryData.name);
        } else {
            const newBeneficiary = new Beneficiary(beneficiaryData);
            await newBeneficiary.save();
            console.log('✅ Beneficiary Added:', beneficiaryData.name);
        }

    } catch (err) {
        console.error('❌ Error inserting beneficiary:', err);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
}
