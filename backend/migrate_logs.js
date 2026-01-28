const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://localhost:27017/smart-pds';

// Schemas
const RequestAuditLogSchema = new mongoose.Schema({
    requestId: String,
    actionDate: { type: Date, default: Date.now },
    action: String,
    performedBy: String,
    comments: String,
    snapshotData: Object
});
const RequestAuditLog = mongoose.model('RequestAuditLog', RequestAuditLogSchema);

const BeneficiaryRequestSchema = new mongoose.Schema({
    submissionDate: Date,
    submittedBy: String,
    status: String,
    adminComments: String,
    data: Object
});
const BeneficiaryRequest = mongoose.model('BeneficiaryRequest', BeneficiaryRequestSchema);

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI);
        const allRequests = await BeneficiaryRequest.find();
        let addedCount = 0;

        for (const req of allRequests) {
            // Check if log already exists
            const exists = await RequestAuditLog.findOne({ requestId: req._id.toString() });
            if (!exists) {
                // 1. Log "Created"
                await RequestAuditLog.create({
                    requestId: req._id,
                    actionDate: req.submissionDate,
                    action: 'Created',
                    performedBy: req.submittedBy,
                    snapshotData: req.data
                });
                addedCount++;

                // 2. If status is NOT Pending, log the action
                if (req.status !== 'Pending') {
                    await RequestAuditLog.create({
                        requestId: req._id,
                        actionDate: new Date(), // We don't have exact action time for old ones, use now
                        action: req.status,
                        performedBy: 'Admin (Legacy)',
                        comments: req.adminComments,
                        snapshotData: req.data // Assume data hasn't changed
                    });
                    addedCount++;
                }
            }
        }
        console.log(`✅ Migration Complete. Added ${addedCount} log entries.`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
