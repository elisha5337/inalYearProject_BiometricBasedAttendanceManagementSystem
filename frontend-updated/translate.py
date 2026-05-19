import os, re

dirs = [
    r'C:\Users\Admin\OneDrive\Desktop\RecentProject\inalYearProject_BiometricBasedAttendanceManagementSystem\frontend-updated\src\screens\admin',
    r'C:\Users\Admin\OneDrive\Desktop\RecentProject\inalYearProject_BiometricBasedAttendanceManagementSystem\frontend-updated\src\screens\hr',
    r'C:\Users\Admin\OneDrive\Desktop\RecentProject\inalYearProject_BiometricBasedAttendanceManagementSystem\frontend-updated\src\screens\employee'
]

extracted_strings = set()

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(filepath, 'r', encoding='cp1252') as f:
            content = f.read()

    original_content = content

    # Find literal text in text-page-title and text-page-sub
    title_pattern = re.compile(r'className=\"[^\"]*text-page-title[^\"]*\">([^<\{]+)</h1>')
    sub_pattern = re.compile(r'className=\"[^\"]*text-page-sub[^\"]*\">([^<\{]+)</p>')
    
    def replacer(match):
        text = match.group(1).strip()
        if not text: return match.group(0)
        extracted_strings.add(text)
        return match.group(0).replace('>' + match.group(1) + '<', '>{t(\'' + text + '\')}<')

    content = title_pattern.sub(replacer, content)
    content = sub_pattern.sub(replacer, content)

    if content != original_content:
        # Add import
        if 'useLanguage' not in content:
            depth = '../../lib/translations'
            content = f"import {{ useLanguage }} from '{depth}';\n" + content
        
        # Add hook
        if 'const { t } = useLanguage();' not in content:
            func_pattern = re.compile(r'(export default function [a-zA-Z0-9_]+\s*\([^\)]*\)\s*\{)')
            content = func_pattern.sub(r'\1\n  const { t } = useLanguage();', content, count=1)
        
        # Write back using utf-8 so everything becomes utf-8
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for d in dirs:
    for f in os.listdir(d):
        if f.endswith('.tsx'):
            process_file(os.path.join(d, f))

print('EXTRACTED:')
for s in extracted_strings:
    print(s)
