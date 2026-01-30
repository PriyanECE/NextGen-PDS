const http = require('http');

const data = JSON.stringify({
    submittedBy: "verifier@pds.com",
    data: {
        name: "Verifier Logic",
        card: "CARD-" + Date.now(),
        gender: "Female",
        members: 2,
        assignedShop: "Test Shop Loc"
    }
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/beneficiary-requests',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log("SENDING REQUEST...");
const req = http.request(options, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
        console.log("Create Response Status:", res.statusCode);
        console.log("Create Response Body:", body);
        try {
            const json = JSON.parse(body);
            if (json._id) {
                // Now Approve it immediately
                approve(json._id);
            }
        } catch (e) { console.error("JSON Parse Error:", e); }
    });
});
req.write(data);
req.end();

function approve(id) {
    const appData = JSON.stringify({
        status: 'Approved',
        adminComments: "Auto Approved by Script"
    });
    const appOptions = {
        hostname: 'localhost',
        port: 5000,
        path: `/api/beneficiary-requests/${id}/status`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': appData.length
        }
    };
    const appReq = http.request(appOptions, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
            console.log("Approve Response Status:", res.statusCode);
            console.log("Approve Response Body:", body);
        });
    });
    appReq.write(appData);
    appReq.end();
}
