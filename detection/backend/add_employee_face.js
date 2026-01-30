const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['manager', 'employee'], default: 'employee' },
    shopLocation: { type: String, required: true },
    gender: { type: String, required: true },
    faceImage: { type: String }, // Path to face image
    status: { type: String, enum: ['active', 'pending_disable', 'disabled'], default: 'active' }
});

const Employee = mongoose.model('Employee', employeeSchema);

const updateFaces = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB Connected");

        const usersToUpdate = [
            { email: 'admin@pds.com', path: 'backend/faces/admin@pds.com.jpg' },
            { email: 'mini@gmail.com', path: 'backend/faces/mini@gmail.com.jpg' }
        ];

        for (const user of usersToUpdate) {
            let emp = await Employee.findOneAndUpdate(
                { email: user.email },
                { faceImage: user.path, status: 'active' },
                { new: true }
            );

            if (emp) {
                console.log(`SUCCESS: Updated face for ${user.email} (${emp.name})`);
            } else {
                console.log(`WARNING: Employee not found for ${user.email}. Trying Manager collection...`);
                // Schema tweak might be needed if looking for Manager
                const Manager = mongoose.model('Manager', new mongoose.Schema({
                    email: String,
                    faceImage: String
                }, { strict: false })); // Flexible schema for quick update

                const mgr = await Manager.findOneAndUpdate(
                    { email: user.email },
                    { faceImage: user.path },
                    { new: true }
                );

                if (mgr) console.log(`SUCCESS: Updated face for Manager ${user.email}`);
                else console.log(`FAILED: Could not find ${user.email} in Employee or Manager.`);
            }
        }

        mongoose.connection.close();
    } catch (error) {
        console.error("Error:", error);
        mongoose.connection.close();
    }
};

updateFaces();
