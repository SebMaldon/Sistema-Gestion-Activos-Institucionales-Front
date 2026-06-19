import os
import re

directory = 'src'

def fix_borders(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    # Fix border-gray-50
    content = re.sub(r'(?<!dark:)border-gray-50\b', 'border-gray-50 dark:border-gray-800', content)
    # Fix border-gray-100
    content = re.sub(r'(?<!dark:)border-gray-100\b', 'border-gray-100 dark:border-gray-800', content)
    # Fix border-gray-200
    content = re.sub(r'(?<!dark:)border-gray-200\b', 'border-gray-200 dark:border-gray-700', content)
    # Fix border-white
    content = re.sub(r'(?<!dark:)border-white\b', 'border-white dark:border-gray-800', content)
    
    # Clean up any potential duplicates
    content = re.sub(r'(dark:border-[a-z]+-[0-9]+(?:/[0-9]+)?)(?:\s+\1)+', r'\1', content)
    content = content.replace('dark:border-gray-800 dark:border-gray-800', 'dark:border-gray-800')
    content = content.replace('dark:border-gray-700 dark:border-gray-700', 'dark:border-gray-700')

    # Also make sure Top Tabs like "Todos los bienes" don't have bright background
    content = re.sub(r'(?<!dark:)bg-gray-100/50\b', 'bg-gray-100/50 dark:bg-gray-800/50', content)
    content = re.sub(r'(?<!dark:)bg-gray-200/50\b', 'bg-gray-200/50 dark:bg-gray-800/50', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_borders(os.path.join(root, file))
print("Done fixing borders!")
