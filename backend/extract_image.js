const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Beneficiary = require('./models/Beneficiary');
require('dotenv').config();

// Fix for raw Base64 if needed
function saveBase64(base64Str, filename) {
    try {
        // Remove header if present
        const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(__dirname, 'uploads', filename);
        fs.writeFileSync(filePath, buffer);
        console.log(`✅ Saved: ${filePath} (${buffer.length} bytes)`);
        return filePath;
    } catch (e) {
        console.error(`❌ Failed to save ${filename}:`, e.message);
        return null;
    }
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("Connected to MongoDB...");
    try {
        // Find by Card ID or just get first one with image
        const user = await Beneficiary.findOne({ card: 'RC-1001' }) || await Beneficiary.findOne({ image: { $exists: true, $ne: '' } });

        if (!user) {
            console.log("❌ No beneficiary found.");
        } else {
            console.log(`FOUND User: ${user.name} (${user.card})`);

            if (user.image && user.image.length > 100) {
                console.log(`Image field length: ${user.image.length}`);
                console.log(`Start of Image: ${user.image.substring(0, 50)}...`);

                const savedPath = saveBase64(user.image, 'debug_head.jpg');

                // Also check family members
                if (user.familyMembers && user.familyMembers.length > 0) {
                    user.familyMembers.forEach((m, i) => {
                        if (m.image && m.image.length > 100) {
                            console.log(`Member ${i} has image.`);
                            saveBase64(m.image, `debug_member_${i}.jpg`);
                        } else {
                            console.log(`Member ${i} has NO valid image.`);
                        }
                    });
                }

                if (savedPath) {
                    // Try Python check
                    console.log("\nAttempting Python Face Check...");
                    const { spawn } = require('child_process');
                    // Verify against ITSELF
                    const pythonProcess = spawn('python', ['face_auth.py', savedPath, savedPath]);

                    pythonProcess.stdout.on('data', (data) => console.log(`Python Output: ${data}`));
                    pythonProcess.stderr.on('data', (data) => console.error(`Python Error: ${data}`));
                    pythonProcess.on('close', (code) => console.log(`Python exited with ${code}`));
                }

            } else {
                console.log("❌ User has no valid image data (too short or empty). image:", user.image);
            }
        }
    } catch (err) {
        console.error("Script Error:", err);
    } finally {
        setTimeout(() => { mongoose.connection.close(); process.exit(); }, 5000);
    }
});
