const API_URL = 'http://localhost:5000/api';

async function testFamilyAuth() {
    console.log("1. Fetching first beneficiary...");
    const res = await fetch(`${API_URL}/beneficiaries`);
    const users = await res.json();

    if (users.length === 0) {
        console.log("No users found.");
        return;
    }

    // Find Praveen Kanth specifically
    const user = users.find(u => u.name.toLowerCase().includes('praveen'));
    if (!user) {
        console.log("User 'Praveen' not found.");
        return;
    }

    if (!user.familyMembers || user.familyMembers.length === 0) {
        console.log("Praveen has no family members.");
        return;
    }

    console.log(`Target User: ${user.name} (${user.card})`);
    const member = user.familyMembers[0];
    console.log(`Target Member: ${member.name} (ID: ${member._id})`);

    // Use the user's HEAD image as the "live" image to ensure it is valid data
    // (It won't match the member's face, but it should be a valid image file)
    const validLiveImage = user.image;

    console.log("\n2. Call Verify-Face with Member ID...");
    const verifyRes = await fetch(`${API_URL}/verify-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cardId: user.card,
            liveImage: validLiveImage,
            memberId: member._id
        })
    });

    const result = await verifyRes.json();
    console.log("Response:", result);

    // We expect it to TRY verification, even if it fails due to dummy image
    // The key is if server logs show "Using Member Image: ..."
}

testFamilyAuth();
