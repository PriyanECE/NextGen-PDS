const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join('d:/PDS', 'coimb11_merged.xlsx');
console.log(`Reading file: ${filePath}`);

const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log(`Total Rows in Sheet: ${data.length}`);

// Count non-empty FPS Code rows (Column 0)
let fpsCount = 0;
data.forEach(row => {
    if (row[0] && typeof row[0] === 'string' && row[0].length > 5 && !row[0].includes('State:')) {
        fpsCount++;
    }
});
console.log(`Estimated FPS Rows: ${fpsCount}`);
