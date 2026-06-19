import os

directory = 'src'

def fix_quotes(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    content = content.replace(r"\'\'", "''")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_quotes(os.path.join(root, file))
print("Done fixing quotes!")
