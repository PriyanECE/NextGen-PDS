const mongoose = require('mongoose');

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-pds';

async function fixIndex() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connected');

        const collection = mongoose.connection.collection('beneficiaryrequests');

        // List indexes
        const indexes = await collection.indexes();
        console.log('Current Indexes:', indexes);

        const indexName = 'data.card_1';
        const exists = indexes.find(idx => idx.name === indexName);

        if (exists) {
            console.log(`Found index ${indexName}. Dropping it...`);
            await collection.dropIndex(indexName);
            console.log('✅ Index dropped successfully.');
        } else {
            console.log(`Index ${indexName} not found. It might have completely different name.`);
            // check for any unique index on data.card
            const otherIndex = indexes.find(idx => idx.key['data.card'] === 1);
            if (otherIndex) {
                console.log(`Found index with key data.card: ${otherIndex.name}. Dropping it...`);
                await collection.dropIndex(otherIndex.name);
                console.log('✅ Index dropped successfully.');
            } else {
                console.log('No index found on data.card.');
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

fixIndex();
