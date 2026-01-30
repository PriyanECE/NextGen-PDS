
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'tn_smartcard_beneficiaries_5000_allshops.json');

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const beneficiaries = JSON.parse(data);

    // Search recursively or if it's a flat array
    let found = null;
    if (Array.isArray(beneficiaries)) {
        found = beneficiaries.find(b => b.name && b.name.includes('Priyan'));
    } else {
        // Assume object with keys
        console.log("Data structure type:", typeof beneficiaries);
    }

    if (found) {
        console.log(JSON.stringify(found, null, 2));
    } else {
        console.log("Beneficiary 'Priyan' not found in the file.");
        // Try case insensitive
        if (Array.isArray(beneficiaries)) {
            found = beneficiaries.find(b => b.name && b.name.toLowerCase().includes('priyan'));
            if (found) console.log("Found (case-insensitive):", JSON.stringify(found, null, 2));
        }
    }

} catch (err) {
    console.error("Error:", err);
}
