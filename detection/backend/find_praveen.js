const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

async function findUser() {
    try {
        await mongoose.connect(MONGO_URI);
        const Beneficiary = mongoose.connection.collection('beneficiaries');

        // Case insensitive search for name containing "Praveen"
        const user = await Beneficiary.findOne({ name: { $regex: /Praveen/i } });

        if (user) {
            console.log("Found User:", user.name);
            console.log("Card ID:", user.card);
            console.log("Family Members:", user.familyMembers);
            console.log("Image Data Type:", typeof user.image);
            if (user.image) console.log("Image Length:", user.image.length);
        } else {
            console.log("User 'Praveen' not found.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

findUser();
