const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error(err));

const EmployeeSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'employee' },
    shopLocation: { type: String, default: 'Main Office' },
    gender: { type: String, default: 'Other' },
    status: { type: String, default: 'active' },
    image: { type: String, default: "" }
});

const Employee = mongoose.model('Employee', EmployeeSchema);

const restoreLogins = async () => {
    try {
        const users = [
            {
                name: 'Supervisor',
                email: 'admin@pds.com',
                password: 'password123',
                role: 'manager',
                image: 'http://localhost:5000/uploads/admin_face.png',
                shopLocation: 'Main Office'
            },
            {
                name: 'Mini User',
                email: 'mini@gmail.com',
                password: 'password123',
                role: 'employee',
                image: 'http://localhost:5000/uploads/admin_face.png',
                shopLocation: 'Coimbatore North'
            }
        ];

        for (const u of users) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(u.password, salt);

            await Employee.findOneAndUpdate(
                { email: u.email },
                {
                    name: u.name,
                    password: hashedPassword,
                    role: u.role,
                    image: u.image,
                    shopLocation: u.shopLocation,
                    status: 'active'
                },
                { upsert: true, new: true }
            );
            console.log(`✅ Restored Account: ${u.email} / ${u.password}`);
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

restoreLogins();
