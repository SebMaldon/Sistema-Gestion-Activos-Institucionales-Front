import os
import re

directory = 'src'

mappings = [
    # Texts
    (r'(?<!dark:)text-emerald-800', 'text-emerald-800 dark:text-emerald-300'),
    (r'(?<!dark:)text-indigo-900', 'text-indigo-900 dark:text-indigo-300'),
    (r'(?<!dark:)text-indigo-700', 'text-indigo-700 dark:text-indigo-400'),
    (r'(?<!dark:)text-red-700', 'text-red-700 dark:text-red-400'),
    (r'(?<!dark:)text-orange-700', 'text-orange-700 dark:text-orange-400'),
    (r'(?<!dark:)text-amber-700', 'text-amber-700 dark:text-amber-400'),
    (r'(?<!dark:)text-yellow-700', 'text-yellow-700 dark:text-yellow-400'),
    (r'(?<!dark:)text-green-700', 'text-green-700 dark:text-green-400'),
    (r'(?<!dark:)text-blue-700', 'text-blue-700 dark:text-blue-400'),
    (r'(?<!dark:)text-purple-700', 'text-purple-700 dark:text-purple-400'),
    (r'(?<!dark:)text-cyan-700', 'text-cyan-700 dark:text-cyan-400'),
    
    # Borders
    (r'(?<!dark:)border-emerald-200/50', 'border-emerald-200/50 dark:border-emerald-800/50'),
    (r'(?<!dark:)border-indigo-100', 'border-indigo-100 dark:border-indigo-800/50'),
    (r'(?<!dark:)border-green-100', 'border-green-100 dark:border-green-800/50'),
    (r'(?<!dark:)border-blue-100', 'border-blue-100 dark:border-blue-800/50'),
    (r'(?<!dark:)border-red-100', 'border-red-100 dark:border-red-800/50'),
    (r'(?<!dark:)border-amber-100', 'border-amber-100 dark:border-amber-800/50'),
    (r'(?<!dark:)border-yellow-100', 'border-yellow-100 dark:border-yellow-800/50'),
    
    # Bgs
    (r'(?<!dark:)bg-indigo-200', 'bg-indigo-200 dark:bg-indigo-900/40'),
    (r'(?<!dark:)bg-emerald-200', 'bg-emerald-200 dark:bg-emerald-900/40'),
]

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    for pattern, replacement in mappings:
        content = re.sub(pattern, replacement, content)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed missing dark variants in {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_file(os.path.join(root, file))
print("Done fixing missing dark texts and borders!")
