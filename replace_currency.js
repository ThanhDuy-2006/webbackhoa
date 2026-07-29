const fs = require('fs');
const path = require('path');

function processFile(filepath) {
    const originalContent = fs.readFileSync(filepath, 'utf8');
    let content = originalContent;

    // Pattern for { expression.toLocaleString('vi-VN') } VND or đ
    // Notice we use [^\{\}]+? to not match across nested brackets
    const patternGeneric = /\{([^\{\}]+?)\.toLocaleString\('vi-VN'\)\}(?:\s*(?:VND|đ|đ|VND\s*\<\/span\>|đ\s*\<\/span\>|VND\s*\<\/td\>|đ\s*\<\/td\>|VND\s*\<\/h3\>|đ\s*\<\/h3\>|VND\s*\<\/p\>|đ\s*\<\/p\>|VND\s*\<\/div\>|đ\s*\<\/div\>|VND\s*\<\/strong\>|đ\s*\<\/strong\>))?/g;
    
    // Actually it's easier to just do:
    const pattern1 = /\{([^\{\}]+?)\.toLocaleString\('vi-VN'\)\}(?:\s*(?:VND|đ|đ))?/g;
    content = content.replace(pattern1, (match, p1) => {
        if (p1.includes('Date(')) return match;
        return `{formatCurrency(${p1})}`;
    });

    const patternTemplate = /\$\{([^\{\}]+?)\.toLocaleString\('vi-VN'\)\}(?:\s*(?:VND|đ|đ))?/g;
    content = content.replace(patternTemplate, (match, p1) => {
        if (p1.includes('Date(')) return match;
        return `\${formatCurrency(${p1})}`;
    });

    if (content !== originalContent) {
        if (!content.includes('formatCurrency')) {
            const importStatement = "import { formatCurrency } from '@/lib/utils'\n";
            const lastImportIndex = content.lastIndexOf('import ');
            if (lastImportIndex !== -1) {
                const endOfLastImport = content.indexOf('\n', lastImportIndex);
                content = content.substring(0, endOfLastImport + 1) + importStatement + content.substring(endOfLastImport + 1);
            } else {
                content = importStatement + content;
            }
        }
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Updated ${filepath}`);
    }
}

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat && stat.isDirectory()) {
            walk(filepath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            processFile(filepath);
        }
    });
}

walk('src');
