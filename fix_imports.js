const fs = require('fs');
const path = require('path');

let count = 0;
function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat && stat.isDirectory()) {
            walk(filepath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(filepath, 'utf8');
            if (content.includes('formatCurrency') && !content.includes('import { formatCurrency }') && !content.includes('export function formatCurrency')) {
                console.log(filepath);
                const importStatement = "import { formatCurrency } from '@/lib/utils'\n";
                const lastImportIndex = content.lastIndexOf('import ');
                let newContent = content;
                if (lastImportIndex !== -1) {
                    const endOfLastImport = content.indexOf('\n', lastImportIndex);
                    newContent = content.substring(0, endOfLastImport + 1) + importStatement + content.substring(endOfLastImport + 1);
                } else {
                    newContent = importStatement + content;
                }
                fs.writeFileSync(filepath, newContent, 'utf8');
                count++;
            }
        }
    });
}
walk('src');
console.log('Fixed ' + count + ' files.');
