import os
import re

directory = 'src'

def fix_all(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # Gray text
    content = re.sub(r'text-gray-900(?! dark:)', 'text-gray-900 dark:text-gray-100', content)
    content = re.sub(r'text-gray-800(?! dark:)', 'text-gray-800 dark:text-gray-200', content)
    content = re.sub(r'text-gray-700(?! dark:)', 'text-gray-700 dark:text-gray-300', content)
    content = re.sub(r'text-gray-600(?! dark:)', 'text-gray-600 dark:text-gray-400', content)

    # Black text
    content = re.sub(r'text-black(?! dark:)', 'text-black dark:text-white', content)
    
    # Blue text (just in case)
    content = re.sub(r'text-blue-900(?! dark:)', 'text-blue-900 dark:text-blue-300', content)
    content = re.sub(r'text-blue-800(?! dark:)', 'text-blue-800 dark:text-blue-300', content)
    content = re.sub(r'text-blue-700(?! dark:)', 'text-blue-700 dark:text-blue-400', content)
    
    # Slate
    content = re.sub(r'text-slate-900(?! dark:)', 'text-slate-900 dark:text-slate-100', content)
    content = re.sub(r'text-slate-800(?! dark:)', 'text-slate-800 dark:text-slate-200', content)
    content = re.sub(r'text-slate-700(?! dark:)', 'text-slate-700 dark:text-slate-300', content)
    content = re.sub(r'text-slate-600(?! dark:)', 'text-slate-600 dark:text-slate-400', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_all(os.path.join(root, file))
print("Done fixing all text colors globally!")
