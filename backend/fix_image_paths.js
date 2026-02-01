const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error(err));

const EmployeeSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    image: String,
    shopLocation: String
});

const Employee = mongoose.model('Employee', EmployeeSchema);

const fixImagePaths = async () => {
    try {
        const correctPath = path.join(__dirname, 'uploads', 'admin_face.png');
        console.log("Setting Image Path to:", correctPath);

        const users = ['admin@pds.com', 'mini@gmail.com', 'admin@smartpds.com'];

        for (const email of users) {
            const updated = await Employee.findOneAndUpdate(
                { email: email },
                { image: correctPath }, // Set ABSOLUTE LOCAL PATH
                { new: true }
            );
            if (updated) {
                console.log(`✅ Updated ${email} with local image path.`);
            } else {
                console.log(`⚠️ User ${email} not found.`);
            }
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixImagePaths();
