import os
import re

directory = 'src'

def fix_dupes(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    content = re.sub(r'(dark:bg-[a-z]+-[0-9]+(?:/[0-9]+)?)(?:\s+\1)+', r'\1', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_dupes(os.path.join(root, file))
print("Done fixing duplicates!")
