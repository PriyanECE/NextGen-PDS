const mongoose = require('mongoose');

// Adjust if your model file paths are different or if you have a central models index
// Assuming models are defined in server.js or separate files. For a standalone script, I'll define partial schemas or try to require them if I knew where they were.
// Looking at previous context, models are often re-defined in scripts for simplicity or imported.
// I'll define simple schemas to query `name` field.

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

const BeneficiarySchema = new mongoose.Schema({ name: String, card: String, familyMembers: [] }, { strict: false });
const EmployeeSchema = new mongoose.Schema({ name: String, email: String }, { strict: false });

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);
const Employee = mongoose.model('Employee', EmployeeSchema);

async function searchDavid() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB. Searching...");

        const regex = /David|Kansal/i;

        const ben = await Beneficiary.find({ name: { $regex: regex } });
        const emp = await Employee.find({ name: { $regex: regex } });

        // Also check family members inside beneficiaries
        // use aggregation or JS filter if dataset is small. 
        // Let's do a broader search if direct name match fails.
        const allBen = await Beneficiary.find({});
        let familyMatches = [];
        allBen.forEach(b => {
            if (b.familyMembers) {
                b.familyMembers.forEach(f => {
                    if (f.name && f.name.match(regex)) {
                        familyMatches.push({ head: b.name, member: f });
                    }
                });
            }
        });

        console.log("--- BENEFICIARIES MATCHING 'David' or 'Kansal' ---");
        console.log(ben);

        console.log("--- EMPLOYEES MATCHING 'David' or 'Kansal' ---");
        console.log(emp);

        console.log("--- FAMILY MEMBERS MATCHING ---");
        console.log(familyMatches);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

searchDavid();
