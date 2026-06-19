import os

directory = 'src'

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    content = content.replace('bg-[#00472e]', 'bg-[#00472e] dark:bg-[#002618]')
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed modal headers in {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_file(os.path.join(root, file))
print("Done fixing modal headers!")
