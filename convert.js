const fs = require('fs');
const content = fs.readFileSync('src/danhsachsanpham.csv', 'utf-8');
const escapedContent = content.replace(/`/g, '\\`');
fs.writeFileSync('src/lib/images/danhsachsanpham.ts', 'export const DANH_SACH_SAN_PHAM_CSV = `\n' + escapedContent + '\n`;');
