
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        updateImage();
    })
    .catch(err => {
        console.error('❌ Connection Error:', err);
        process.exit(1);
    });

const BeneficiarySchema = new mongoose.Schema({
    card: String,
    image: String,
    familyMembers: [{
        name: String,
        image: String,
        // other fields ignored for this operation
    }]
}, { strict: false });

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);

async function updateImage() {
    try {
        const imagePath = "D:\\PDS\\images\\Praveen Kanth.jpeg";

        if (!fs.existsSync(imagePath)) {
            console.error(`❌ Image file not found at: ${imagePath}`);
            return;
        }

        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

        console.log(`📸 Image converted to Base64 (Length: ${base64Image.length})`);

        const cardId = "TN-722824106120";
        const result = await Beneficiary.findOne({ card: cardId });

        if (!result) {
            console.error('❌ Beneficiary not found!');
        } else {
            // Update main image and family member image
            result.image = base64Image;
            if (result.familyMembers && result.familyMembers.length > 0) {
                result.familyMembers[0].image = base64Image;
            }

            await result.save();
            console.log('✅ Successfully updated image for Praveen Kanth');
        }

    } catch (err) {
        console.error('❌ Error updating beneficiary:', err);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
}
