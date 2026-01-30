const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Schema
const BeneficiarySchema = new mongoose.Schema({
    name: String,
    card: String,
    image: String,
    familyMembers: [{
        name: String,
        image: String
    }]
});
const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);

// Config
const SOURCE_DIR = path.join(__dirname, '../images');
const DEST_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

async function importImages() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds');
    console.log("Connected to DB");

    if (!fs.existsSync(SOURCE_DIR)) {
        console.error("Source directory not found:", SOURCE_DIR);
        process.exit(1);
    }

    const files = fs.readdirSync(SOURCE_DIR);

    for (const file of files) {
        // Extract name (e.g., "Praveen Kanth.jpeg" -> "Praveen Kanth")
        const name = path.parse(file).name;
        const ext = path.parse(file).ext; // .jpeg

        // Find user by name (Case Insensitive Regex)
        const user = await Beneficiary.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (user) {
            // New Filename: CardID_head.ext
            const newFilename = `${user.card}_head${ext}`;
            const srcPath = path.join(SOURCE_DIR, file);
            const destPath = path.join(DEST_DIR, newFilename);

            // Copy File
            fs.copyFileSync(srcPath, destPath);

            // Update DB (Store relative path: uploads/...)
            user.image = `uploads/${newFilename}`;
            await user.save();

            console.log(`✅ MATCH: ${name} -> ${user.card} (Saved to ${user.image})`);
        } else {
            console.log(`❌ NO MATCH: Could not find beneficiary named "${name}"`);

            // Try checking family members? (Optional enhancement)
            // For now, simple name match.
        }
    }

    console.log("Import Complete");
    process.exit();
}

importImages();
