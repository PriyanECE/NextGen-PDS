const http = require('http');

const url = 'http://localhost:5000/api/reports';

console.log(`Testing API: ${url}`);

http.get(url, (res) => {
    let data = '';
    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(`Total Records: ${json.length}`);
            if (json.length > 0) {
                console.log('Sample Record Item Type:', typeof json[0].items);
                console.log('Sample Record Items:', JSON.stringify(json[0].items, null, 2));
            }
        } catch (e) {
            console.log('Response (Not JSON):', data);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
