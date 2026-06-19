import os
import re

directory = 'src'

def fix_all(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # Text colors
    content = re.sub(r'text-slate-800(?! dark:)', 'text-slate-800 dark:text-slate-200', content)
    content = re.sub(r'text-slate-700(?! dark:)', 'text-slate-700 dark:text-slate-300', content)
    content = re.sub(r'text-slate-600(?! dark:)', 'text-slate-600 dark:text-slate-400', content)
    
    # Also in ReportesSeccion.jsx there's text-emerald-800? Actually text-emerald-600 dark:text-emerald-400 is already there.

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_all(os.path.join(root, file))
print("Done fixing slate text corruptions!")
