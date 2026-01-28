const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';
const TARGET_EMAIL = process.argv[2];
const IMG_PATH = process.argv[3];

if (!TARGET_EMAIL || !IMG_PATH) {
    console.error("Usage: node add_employee_face.js <email> <path_to_image>");
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

            const employee = await Employee.findOne({ email: TARGET_EMAIL.toLowerCase() });
            if (!employee) {
                console.error(`❌ Employee with email ${TARGET_EMAIL} not found!`);
                process.exit(1);
            }

            employee.image = base64Image;
            await employee.save();
            console.log(`✅ Employee (${employee.name} - ${employee.email}) face updated!`);

        } catch (err) {
            console.error("❌ Error:", err.message);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
