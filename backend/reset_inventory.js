const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart-pds";

const InventorySchema = new mongoose.Schema({
    type: { type: String, unique: true },
    rice: {
        total: { type: Number, default: 0 },
        dispensed: { type: Number, default: 0 }
    },
    dhal: {
        total: { type: Number, default: 0 },
        dispensed: { type: Number, default: 0 }
    },
    lastUpdated: { type: Date, default: Date.now }
});

const Inventory = mongoose.model('Inventory', InventorySchema);

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ Connected to MongoDB");

        const res = await Inventory.findOneAndUpdate(
            { type: 'daily_stock' },
            {
                $set: {
                    "rice.total": 0,
                    "dhal.total": 0,
                    // Optionally reset dispensed too if they want a clean slate? 
                    // User said "dlt this last entry of 500kg". Usually implies total.
                    // I will leave dispensed as is unless asked, or maybe reset it to ensure consistency if testing.
                    // Let's just reset total.
                }
            },
            { new: true }
        );

        if (res) {
            console.log("✅ Inventory Validated/Reset:");
            console.log("   Rice Total:", res.rice.total);
            console.log("   Dhal Total:", res.dhal.total);
        } else {
            console.log("❌ No inventory found to reset.");
        }

        mongoose.connection.close();
    })
    .catch(err => {
        console.error("❌ Error:", err);
        process.exit(1);
    });
