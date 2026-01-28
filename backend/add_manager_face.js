const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';
const IMG_PATH = process.argv[2]; // Pass image path as argument

if (!IMG_PATH) {
    console.error("Usage: node add_manager_face.js <path_to_image>");
    process.exit(1);
}

const EmployeeSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'employee' },
    shopLocation: { type: String, default: 'Main Office' },
    gender: { type: String, default: 'Other' },
    status: { type: String, default: 'active', enum: ['active', 'pending_disable', 'disabled'] },
    image: { type: String, default: "" }
});

const Employee = mongoose.model('Employee', EmployeeSchema);

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Connected');

        try {
            // Read Image to Base64
            const imgBuffer = fs.readFileSync(IMG_PATH);
            const base64Image = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;

            const manager = await Employee.findOne({ role: 'manager' });
            if (!manager) {
                console.error("❌ Manager not found!");
                process.exit(1);
            }

            manager.image = base64Image;
            await manager.save();
            console.log(`✅ Manager (${manager.email}) face updated!`);

        } catch (err) {
            console.error("❌ Error:", err.message);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
