const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const BeneficiarySchema = new mongoose.Schema({
    name: String,
    card: { type: String, unique: true },
    status: String
});

const BeneficiaryRequestSchema = new mongoose.Schema({
    submissionDate: Date,
    submittedBy: String,
    status: String,
    data: Object
});

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);
const BeneficiaryRequest = mongoose.model('BeneficiaryRequest', BeneficiaryRequestSchema);

async function inspectData() {
    try {
        const beneficiaries = await Beneficiary.find({});
        console.log('\n--- ACTIVE BENEFICIARIES ---');
        beneficiaries.forEach(b => console.log(`- ${b.name} (${b.card}) [${b.status}]`));

        const requests = await BeneficiaryRequest.find({});
        console.log('\n--- PENDING REQUESTS ---');
        requests.forEach(r => console.log(`- ${r.data?.name} (${r.data?.card}) [${r.status}] (By: ${r.submittedBy})`));

    } catch (err) {
        console.error('❌ Error inspecting data:', err);
    } finally {
        mongoose.disconnect();
    }
}

inspectData();
