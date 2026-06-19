import os
import re

directory = 'src'

def fix_all(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # Backgrounds with gradients
    content = re.sub(r'from-teal-50(?! dark:)', 'from-teal-50 dark:from-teal-900/20', content)
    content = re.sub(r'to-emerald-50(?! dark:)', 'to-emerald-50 dark:to-emerald-900/20', content)
    
    # Disabled inputs
    content = re.sub(r'disabled:bg-gray-100(?! dark:)', 'disabled:bg-gray-100 dark:disabled:bg-gray-800/50', content)
    
    # Borders
    content = re.sub(r'border-teal-100/60(?! dark:)', 'border-teal-100/60 dark:border-teal-800/50', content)
    content = re.sub(r'border-teal-100(?! dark:)', 'border-teal-100 dark:border-teal-800/50', content)
    content = re.sub(r'border-emerald-100/60(?! dark:)', 'border-emerald-100/60 dark:border-emerald-800/50', content)
    content = re.sub(r'border-emerald-100(?! dark:)', 'border-emerald-100 dark:border-emerald-800/50', content)
    content = re.sub(r'border-green-300(?! dark:)', 'border-green-300 dark:border-green-800/50', content)
    content = re.sub(r'border-teal-200(?! dark:)', 'border-teal-200 dark:border-teal-800/50', content)

    # Texts
    content = re.sub(r'text-teal-800(?! dark:)', 'text-teal-800 dark:text-teal-300', content)
    content = re.sub(r'text-teal-700(?! dark:)', 'text-teal-700 dark:text-teal-400', content)
    
    # Hover states
    content = re.sub(r'hover:bg-teal-100(?! dark:)', 'hover:bg-teal-100 dark:hover:bg-teal-800/50', content)
    content = re.sub(r'hover:bg-teal-50(?! dark:)', 'hover:bg-teal-50 dark:hover:bg-teal-900/20', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_all(os.path.join(root, file))
print("Done fixing salidas corruptions!")
