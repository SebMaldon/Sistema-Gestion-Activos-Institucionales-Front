import os
import re

directory = 'src'

def fix_dividers(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    # Fix divide classes
    content = re.sub(r'(?<!dark:)divide-gray-50\b', 'divide-gray-50 dark:divide-gray-800', content)
    content = re.sub(r'(?<!dark:)divide-gray-100\b', 'divide-gray-100 dark:divide-gray-800', content)
    content = re.sub(r'(?<!dark:)divide-gray-200\b', 'divide-gray-200 dark:divide-gray-700', content)
    
    # Also fix some button backgrounds that the user complained about
    # "contornos blancos, los estatus y eso tambien"
    # Action buttons: bg-green-50 dark:bg-green-900/20 might have a bright border?
    # Let's fix table row hover color if it's white?
    content = re.sub(r'hover:bg-gray-50\b', 'hover:bg-gray-50 dark:hover:bg-gray-800/50', content)
    
    # Fix bg-white
    content = re.sub(r'(?<!dark:)bg-white\b', 'bg-white dark:bg-gray-800', content)
    # Re-deduplicate just in case we created dark:bg-gray-800 dark:bg-gray-800
    content = content.replace('bg-white dark:bg-gray-800 dark:bg-gray-800', 'bg-white dark:bg-gray-800')
    content = content.replace('bg-white dark:bg-gray-900 dark:bg-gray-800', 'bg-white dark:bg-gray-900') # keep 900 if already there
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_dividers(os.path.join(root, file))
print("Done fixing dividers and hovers!")
