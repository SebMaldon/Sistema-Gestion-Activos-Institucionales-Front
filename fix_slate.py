import os
import re

directory = 'src'

def fix_all(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # 1. Borders
    content = re.sub(r'border-purple-200(?! dark:)', 'border-purple-200 dark:border-purple-800/50', content)
    content = re.sub(r'border-teal-200(?! dark:)', 'border-teal-200 dark:border-teal-800/50', content)
    content = re.sub(r'border-blue-100(?! dark:)', 'border-blue-100 dark:border-blue-800/50', content)
    
    # 2. Slate
    content = re.sub(r'bg-slate-50(?! dark:)', 'bg-slate-50 dark:bg-slate-900/20', content)
    content = re.sub(r'bg-slate-100/50(?! dark:)', 'bg-slate-100/50 dark:bg-slate-800/30', content)
    content = re.sub(r'bg-slate-100(?! dark:)', 'bg-slate-100 dark:bg-slate-800/50', content)
    content = re.sub(r'border-slate-100(?! dark:)', 'border-slate-100 dark:border-slate-800/50', content)
    content = re.sub(r'border-slate-200(?! dark:)', 'border-slate-200 dark:border-slate-700/50', content)
    content = re.sub(r'border-slate-300(?! dark:)', 'border-slate-300 dark:border-slate-600/50', content)
    
    # Fix the /50/50 bug globally
    content = re.sub(r'(dark:[a-z]+-[a-z]+-[0-9]+/[0-9]+)/[0-9]+', r'\1', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_all(os.path.join(root, file))
print("Done fixing all corruptions!")
