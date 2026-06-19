import os
import re

directory = "c:/Users/smmse/OneDrive/Documents/AppsResidencia/Sistema-Gestion-Activos-Institucionales-Front/src"

mapping = {
    'bg-white': 'dark:bg-gray-800',
    'bg-gray-50': 'dark:bg-gray-900',
    'bg-gray-100': 'dark:bg-gray-800',
    'bg-gray-200': 'dark:bg-gray-700',
    'text-gray-900': 'dark:text-gray-100',
    'text-gray-800': 'dark:text-gray-200',
    'text-gray-700': 'dark:text-gray-300',
    'text-gray-600': 'dark:text-gray-400',
    'text-gray-500': 'dark:text-gray-400',
    'border-gray-100': 'dark:border-gray-800',
    'border-gray-200': 'dark:border-gray-700',
    'border-gray-300': 'dark:border-gray-600',
    'hover:bg-white': 'dark:hover:bg-gray-700',
    'hover:bg-gray-50': 'dark:hover:bg-gray-700',
    'hover:bg-gray-100': 'dark:hover:bg-gray-600',
    'hover:bg-gray-200': 'dark:hover:bg-gray-600',
    'bg-black/50': 'dark:bg-black/70',
}

# Regex to find anything inside className="..." or className={`...`} or className={'...'}
# This is complex, so we'll just tokenize the whole file by splitting on whitespace, quotes, and backticks.
# Actually, since Tailwind classes are just words separated by whitespace, we can use a simpler approach:
# Replace every occurrence of a class with itself + dark class, but first STRIP ALL EXISTING DARK CLASSES that we manage.

count = 0
dark_classes_to_remove = set(mapping.values()) | {'dark:bg-gray-900/50', 'dark:bg-gray-800/80', 'dark:hover:bg-gray-800/10', 'dark:bg-gray-800/15', 'dark:hover:bg-gray-800', 'dark:bg-gray-900/10'}

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # First, carefully remove all existing known dark classes to avoid duplication
            # Only remove them if they are full words
            temp_content = content
            for dc in dark_classes_to_remove:
                # remove whole word
                temp_content = re.sub(r'(?<![a-zA-Z0-9\-\:])' + re.escape(dc) + r'(?![a-zA-Z0-9\-\:])', '', temp_content)
                
            # Now, for each mapping, if we find the light class, append the dark class next to it.
            # E.g., `bg-white` -> `bg-white dark:bg-gray-800`
            for light, dark in mapping.items():
                # Replace whole word `light` with `light dark`
                temp_content = re.sub(r'(?<![a-zA-Z0-9\-\:])' + re.escape(light) + r'(?![a-zA-Z0-9\-\:])', f'{light} {dark}', temp_content)

            # Cleanup multiple spaces that might have been introduced
            temp_content = re.sub(r' {2,}', ' ', temp_content)
            
            # Additional cleanup for things like bg-white dark:bg-gray-800 dark:bg-gray-800
            temp_content = re.sub(r'(dark:[\w/-]+)(?:\s+\1)+', r'\1', temp_content)

            if content != temp_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(temp_content)
                count += 1

print(f"Cleanly updated {count} JSX files for dark mode!")
