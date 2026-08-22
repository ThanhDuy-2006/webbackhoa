const fs = require('fs');
const content = fs.readFileSync('src/danhsachsanpham.csv', 'utf-8');
const lines = content.split(/\r?\n/);
let count = 0;
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if(!line) continue;
    const lastComma = line.lastIndexOf(',');
    if(lastComma !== -1) {
        count++;
    }
}
console.log('Valid lines:', count);
