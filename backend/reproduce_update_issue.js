// Native fetch in Node 18+

const API_URL = 'http://localhost:5000/api';

async function reproduceIssue() {
    // 1. Fetch an existing beneficiary to get a real Card ID
    console.log("Fetching existing beneficiaries...");
    const res = await fetch(`${API_URL}/beneficiaries`);
    const users = await res.json();

    if (users.length === 0) {
        console.log("No beneficiaries found to test with.");
        return;
    }

    const targetUser = users[0];
    console.log(`Targeting User: ${targetUser.name} (${targetUser.card})`);

    // 2. Submit a request using this existing Card ID (simulating an Update)
    const payload = {
        submittedBy: 'test_admin@pds.com',
        requestType: 'UPDATE', // Testing the fix
        data: {
            ...targetUser,
            name: targetUser.name + " (Updated)", // Change name
            assignedShop: 'Main Office' // Ensure valid shop
        }
    };

    console.log("\nAttempting to submit request for EXISTING Card ID...");
    const reqRes = await fetch(`${API_URL}/beneficiary-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await reqRes.json();

    if (reqRes.ok) {
        console.log("SUCCESS: Request Submitted (Unexpected for current bug)");
        console.log("Response:", result);
    } else {
        console.log("FAILED: Request Blocked (Expected behavior for bug)");
        console.log("Error:", result.error);
    }
}

reproduceIssue();
