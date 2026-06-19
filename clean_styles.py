import os
import re

directory = 'src'

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    # Fix repeated dark:bg-X-900/Y/Z things.
    # E.g. dark:bg-green-900/20/20 dark:bg-green-900/20/50 -> dark:bg-green-900/20
    # or just remove duplicate dark classes and fix the slash chaining
    
    # 1. Fix slash chaining: dark:bg-red-900/20/20/20 -> dark:bg-red-900/20
    content = re.sub(r'(dark:bg-\w+-\d+)(?:/\d+)+', r'\1/20', content)
    
    # 2. Fix gradients: from-green-50 to-emerald-50
    content = content.replace('bg-gradient-to-br from-green-50 to-emerald-50', 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40')
    content = content.replace('bg-gradient-to-br from-green-50/80 to-emerald-50/80', 'bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/40 dark:to-emerald-900/40')
    content = content.replace('bg-gradient-to-bl from-green-50 to-transparent', 'bg-gradient-to-bl from-green-50 dark:from-green-900/40 to-transparent')
    
    # 3. Fix bg-[#f0fdf4]
    content = content.replace("style={{ backgroundColor: '#f0fdf4' }}", "className=\"bg-green-50 dark:bg-green-900/20\"")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            clean_file(os.path.join(root, file))
print("Done cleaning!")
