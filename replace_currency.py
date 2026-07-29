import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Replace `.toLocaleString('vi-VN') + " đ"` -> `formatCurrency(...)` (with appropriate import)
    # We will just do a simple string replacement for the most common patterns.
    # Pattern 1: {amount.toLocaleString('vi-VN')} VND
    # Pattern 2: {amount.toLocaleString('vi-VN')}đ
    # Pattern 3: {amount.toLocaleString('vi-VN')} đ
    # Pattern 4: {amount.toLocaleString('vi-VN')} \n VND
    
    # regex for { (something).toLocaleString('vi-VN') } VND or đ
    # We need to capture the variable before `.toLocaleString('vi-VN')`
    
    pattern1 = re.compile(r'\{([^}]+?)\.toLocaleString\(\'vi-VN\'\)\}\s*(?:VND|đ|đ|VND)')
    # Let's replace {X.toLocaleString('vi-VN')} VND with {formatCurrency(X)}
    
    content, count1 = pattern1.subn(r'{formatCurrency(\1)}', content)
    
    pattern2 = re.compile(r'\{([^}]+?)\.toLocaleString\(\'vi-VN\'\)\}\s*\<\/?(span|strong|h3|p|div|td|th)[^>]*\>\s*(?:VND|đ)')
    # Actually it's easier to just do:
    # 1. find .toLocaleString('vi-VN')
    # If it's a date, skip it.
    
    # We'll just write a custom replacer
    import collections
    
    def replacer(match):
        var = match.group(1)
        if 'Date(' in var:
            return match.group(0) # Keep dates
        return f'{{formatCurrency({var})}}'

    # pattern to match { ... .toLocaleString('vi-VN') } [VND|đ]? 
    pattern_generic = re.compile(r'\{([^}]+?)\.toLocaleString\(\'vi-VN\'\)\}(?:\s*(?:VND|đ))?')
    content, count_generic = pattern_generic.subn(replacer, content)

    # Some might be string concatenation like: `... ${amount.toLocaleString('vi-VN')}đ ...`
    def replacer_template(match):
        var = match.group(1)
        if 'Date(' in var:
            return match.group(0)
        return f'${{formatCurrency({var})}}'

    pattern_template = re.compile(r'\$\{([^}]+?)\.toLocaleString\(\'vi-VN\'\)\}(?:\s*(?:VND|đ))?')
    content, count_template = pattern_template.subn(replacer_template, content)

    if content != original_content:
        # Check if formatCurrency is imported
        if 'formatCurrency' not in content:
            # Add import to the top
            import_statement = "import { formatCurrency } from '@/lib/utils'\n"
            # Find the last import
            last_import = content.rfind('import ')
            if last_import != -1:
                end_of_last_import = content.find('\n', last_import)
                content = content[:end_of_last_import+1] + import_statement + content[end_of_last_import+1:]
            else:
                content = import_statement + content
                
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            process_file(os.path.join(root, file))
