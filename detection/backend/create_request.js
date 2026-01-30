const fetch = require('node-fetch');

async function run() {
    try {
        const res = await fetch('http://localhost:5000/api/beneficiary-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                submittedBy: "test_verifier@pds.com",
                data: {
                    name: "Verifier Test",
                    card: "TEST-VERIFY-" + Date.now(),
                    gender: "Male",
                    members: 5,
                    assignedShop: "Test Shop"
                }
            })
        });
        const data = await res.json();
        console.log("Created Request:", data);
    } catch (e) {
        console.error(e);
    }
}
run();
