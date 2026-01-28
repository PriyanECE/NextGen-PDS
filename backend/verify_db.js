const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://localhost:27017/smart-pds';

// Minimal Schemas
const RequestAuditLog = mongoose.model('RequestAuditLog', new mongoose.Schema({ any: {} }, { strict: false }));
const BeneficiaryRequest = mongoose.model('BeneficiaryRequest', new mongoose.Schema({ any: {} }, { strict: false }));

async function check() {
    try {
        await mongoose.connect(MONGO_URI);

        console.log("--- BENEFICIARY REQUESTS (Last 3) ---");
        const reqs = await BeneficiaryRequest.find().sort({ _id: -1 }).limit(3);
        console.log(JSON.stringify(reqs, null, 2));

        console.log("\n--- AUDIT LOGS (Last 3) ---");
        const logs = await RequestAuditLog.find().sort({ _id: -1 }).limit(3);
        console.log(JSON.stringify(logs, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

check();
