const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

const EmployeeSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    role: { type: String, default: 'employee' },
    image: { type: String, default: "" }
});

const Employee = mongoose.model('Employee', EmployeeSchema);

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Connected');
        try {
            const managers = await Employee.find({ role: 'manager' });
            console.log(`Found ${managers.length} managers.`);

            managers.forEach(m => {
                const hasImage = !!m.image && m.image.length > 100;
                console.log(`Manager: ${m.email}, Name: ${m.name}, HasImage: ${hasImage}, ImageLen: ${m.image ? m.image.length : 0}`);
            });

        } catch (err) {
            console.error("❌ Error:", err.message);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
