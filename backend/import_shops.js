const xlsx = require('xlsx');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config(); // Load env for Mongo URI

// --- Schema Definition (Match server.js) ---
const shopSchema = new mongoose.Schema({
    code: String,
    name: String,
    ownerName: String,
    address: String,
    tehsil: String,
    district: String,
    contactNumber: String
});
const Shop = mongoose.model('Shop', shopSchema);

// --- DB Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/smart-pds');
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ DB Connection Error:', err);
        process.exit(1);
    }
};

const parseAndSeed = async () => {
    await connectDB();

    const filePath = path.join('d:/PDS', 'coimb11_merged.xlsx');
    console.log(`Reading file: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    let currentDistrict = 'Coimbatore'; // Default
    let currentTehsil = 'Unknown';
    let shopsToInsert = [];

    // Regex to detect Title Row: "State: Tamil Nadu I District: Coimbatore I Tehsil: Sulur"
    const titleRowRegex = /District:\s*([a-zA-Z\s]+).*Tehsil:\s*([a-zA-Z\s]+)/i;

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        // 1. Check if it's a Title Row (Merged cell likely in first index)
        // Usually contains "Tehsil:"
        const textObj = row[0];
        if (typeof textObj === 'string' && textObj.includes('Tehsil:')) {
            // Robust parsing for "State: ... I District: ... I Tehsil: ..."
            const parts = textObj.split('I').map(s => s.trim());
            // parts[0] = State: Tamil Nadu
            // parts[1] = District: Coimbatore
            // parts[2] = Tehsil: Sulur

            const districtPart = parts.find(p => p.startsWith('District:'));
            const tehsilPart = parts.find(p => p.startsWith('Tehsil:'));

            if (districtPart) currentDistrict = districtPart.replace('District:', '').trim();
            if (tehsilPart) {
                currentTehsil = tehsilPart.replace('Tehsil:', '').trim();
                // Remove trailing "Total" info if present
                if (currentTehsil.includes('Total')) {
                    currentTehsil = currentTehsil.split('Total')[0].trim();
                }
            }
            console.log(`📍 Found Section: District=${currentDistrict}, Tehsil=${currentTehsil}`);
            continue;
        }

        // 2. Check if Header Row ("FPS Code")
        // 2. Check if Header Row ("FPS Code")
        if (row[0] === 'FPS Code') continue;

        // 3. Data Row
        const fpsCode = row[0];
        // RELAXED CHECK: valid generic FPS code string
        if (!fpsCode || typeof fpsCode !== 'string' || fpsCode.length < 3) continue;
        // Ignore known headers or junk
        if (fpsCode.includes('Fair Price Shop') || fpsCode.includes('State:')) continue;

        const nameOwnerStr = row[1];
        let fpsName = nameOwnerStr || "Unknown Shop";
        let ownerName = 'Unknown';

        // Parse Name/Owner: "Shop Name\nOwner: Person Name"
        if (typeof nameOwnerStr === 'string' && nameOwnerStr.includes('Owner:')) {
            const parts = nameOwnerStr.split(/Owner:/i);
            fpsName = parts[0].replace(/[\r\n]+/g, ' ').trim();
            ownerName = parts[1].trim();
        }

        // Address: Fallback logic for various column positions
        let address = row[10];
        if (!address || address.length < 5) {
            address = row[row.length - 1];
        }
        if (typeof address === 'string') {
            address = address.replace('View Location', '').trim();
        } else {
            address = "Address details pending";
        }

        shopsToInsert.push({
            code: fpsCode,
            name: fpsName,
            ownerName: ownerName,
            address: address,
            tehsil: currentTehsil,
            district: currentDistrict,
            contactNumber: "Pending" // Not in excel
        });
    }

    console.log(`Found ${shopsToInsert.length} shops.`);

    if (shopsToInsert.length > 0) {
        // Clear Existing
        await Shop.deleteMany({});
        console.log(`🧹 Cleared existing shops.`);

        // Insert
        await Shop.insertMany(shopsToInsert);
        console.log(`✅ Successfully inserted ${shopsToInsert.length} shops.`);
    }

    mongoose.disconnect();
};

parseAndSeed();
