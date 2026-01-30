const mongoose = require('mongoose');
const Beneficiary = require('./models/Beneficiary');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const cardId = 'RC-1001';
        const user = await Beneficiary.findOne({ card: cardId });
        if (!user) {
            console.log('User not found');
        } else {
            console.log('--- USER DATA ---');
            console.log('Card:', user.card);
            console.log('Image:', user.image);
            console.log('Family Members:', user.familyMembers ? user.familyMembers.length : 0);
            if (user.familyMembers) {
                user.familyMembers.forEach((m, i) => {
                    console.log(` Member ${i + 1}: ${m.name} | Image: ${m.image}`);
                });
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
});
