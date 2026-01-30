const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://localhost:27017/smart-pds';

// Minimal Schemas
const RequestAuditLog = mongoose.model('RequestAuditLog', new mongoose.Schema({ any: {} }, { strict: false }));
const BeneficiaryRequest = mongoose.model('BeneficiaryRequest', new mongoose.Schema({ any: {} }, { strict: false }));

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const reqCount = await BeneficiaryRequest.countDocuments();
        const logCount = await RequestAuditLog.countDocuments();

        console.log(`BeneficiaryRequests Count: ${reqCount}`);
        console.log(`RequestAuditLogs Count: ${logCount}`);

        if (reqCount > 0) {
            const sample = await BeneficiaryRequest.findOne();
            console.log("Sample Request:", JSON.stringify(sample, null, 2));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

check();
