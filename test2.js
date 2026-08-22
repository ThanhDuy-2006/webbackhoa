const fs = require('fs');
const content = fs.readFileSync('src/danhsachsanpham.csv', 'utf-8');
const lines = content.split(/\r?\n/);
const map = new Map();
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if(!line) continue;
    const lastComma = line.lastIndexOf(',');
    if(lastComma !== -1) {
        let name = line.substring(0, lastComma).trim();
        if(name.startsWith('\"') && name.endsWith('\"')) {
            name = name.substring(1, name.length - 1).trim();
        }
        const url = line.substring(lastComma + 1).trim();
        if(name && url) map.set(name.toLowerCase(), url);
    }
}
const searchName = 'Cà rốt củ từ 150g trở lên'.toLowerCase();
let matchedUrl = null;
const keys = Array.from(map.keys()).sort((a, b) => b.length - a.length);
for (const key of keys) {
    if (searchName.includes(key) || key.includes(searchName)) {
        matchedUrl = map.get(key);
        console.log('Matched:', key);
        break;
    }
}
console.log('Matched URL:', matchedUrl);
