const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join('d:/PDS', 'coimb11_merged.xlsx');
console.log(`Reading file: ${filePath}`);

const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
console.log(`Sheet Name: ${sheetName}`);

const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // Get array of arrays

if (data.length > 0) {
    console.log("Headers:", data[0]);
    if (data.length > 1) {
        console.log("First Row Data:", data[1]);
        console.log("Second Row Data:", data[2]);
    }
} else {
    console.log("Sheet appears empty.");
}
