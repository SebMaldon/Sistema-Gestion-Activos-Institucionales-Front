import os
import re

directory = "c:/Users/smmse/OneDrive/Documents/AppsResidencia/Sistema-Gestion-Activos-Institucionales-Front/src"

pastel_mappings = [
    # Backgrounds
    (r'(?<!dark:)bg-red-50', 'bg-red-50 dark:bg-red-900/20'),
    (r'(?<!dark:)bg-green-50', 'bg-green-50 dark:bg-green-900/20'),
    (r'(?<!dark:)bg-blue-50', 'bg-blue-50 dark:bg-blue-900/20'),
    (r'(?<!dark:)bg-yellow-50', 'bg-yellow-50 dark:bg-yellow-900/20'),
    (r'(?<!dark:)bg-amber-50', 'bg-amber-50 dark:bg-amber-900/20'),
    (r'(?<!dark:)bg-orange-50', 'bg-orange-50 dark:bg-orange-900/20'),
    (r'(?<!dark:)bg-purple-50', 'bg-purple-50 dark:bg-purple-900/20'),
    (r'(?<!dark:)bg-cyan-50', 'bg-cyan-50 dark:bg-cyan-900/20'),
    (r'(?<!dark:)bg-emerald-50', 'bg-emerald-50 dark:bg-emerald-900/20'),
    (r'(?<!dark:)bg-indigo-50', 'bg-indigo-50 dark:bg-indigo-900/20'),
    (r'(?<!dark:)bg-teal-50', 'bg-teal-50 dark:bg-teal-900/20'),
    
    (r'(?<!dark:)bg-red-100', 'bg-red-100 dark:bg-red-900/40'),
    (r'(?<!dark:)bg-green-100', 'bg-green-100 dark:bg-green-900/40'),
    (r'(?<!dark:)bg-blue-100', 'bg-blue-100 dark:bg-blue-900/40'),
    (r'(?<!dark:)bg-yellow-100', 'bg-yellow-100 dark:bg-yellow-900/40'),
    (r'(?<!dark:)bg-amber-100', 'bg-amber-100 dark:bg-amber-900/40'),
    (r'(?<!dark:)bg-orange-100', 'bg-orange-100 dark:bg-orange-900/40'),
    (r'(?<!dark:)bg-purple-100', 'bg-purple-100 dark:bg-purple-900/40'),
    (r'(?<!dark:)bg-cyan-100', 'bg-cyan-100 dark:bg-cyan-900/40'),
    (r'(?<!dark:)bg-emerald-100', 'bg-emerald-100 dark:bg-emerald-900/40'),
    (r'(?<!dark:)bg-indigo-100', 'bg-indigo-100 dark:bg-indigo-900/40'),
    (r'(?<!dark:)bg-teal-100', 'bg-teal-100 dark:bg-teal-900/40'),

    # Texts
    (r'(?<!dark:)text-red-600', 'text-red-600 dark:text-red-400'),
    (r'(?<!dark:)text-green-600', 'text-green-600 dark:text-green-400'),
    (r'(?<!dark:)text-blue-600', 'text-blue-600 dark:text-blue-400'),
    (r'(?<!dark:)text-yellow-600', 'text-yellow-600 dark:text-yellow-400'),
    (r'(?<!dark:)text-amber-600', 'text-amber-600 dark:text-amber-400'),
    (r'(?<!dark:)text-orange-600', 'text-orange-600 dark:text-orange-400'),
    (r'(?<!dark:)text-purple-600', 'text-purple-600 dark:text-purple-400'),
    (r'(?<!dark:)text-cyan-600', 'text-cyan-600 dark:text-cyan-400'),
    (r'(?<!dark:)text-emerald-600', 'text-emerald-600 dark:text-emerald-400'),
    (r'(?<!dark:)text-indigo-600', 'text-indigo-600 dark:text-indigo-400'),
    (r'(?<!dark:)text-teal-600', 'text-teal-600 dark:text-teal-400'),

    (r'(?<!dark:)text-red-700', 'text-red-700 dark:text-red-300'),
    (r'(?<!dark:)text-green-700', 'text-green-700 dark:text-green-300'),
    (r'(?<!dark:)text-blue-700', 'text-blue-700 dark:text-blue-300'),
    (r'(?<!dark:)text-amber-700', 'text-amber-700 dark:text-amber-300'),

    (r'(?<!dark:)text-red-800', 'text-red-800 dark:text-red-300'),
    (r'(?<!dark:)text-green-800', 'text-green-800 dark:text-green-300'),
    (r'(?<!dark:)text-blue-800', 'text-blue-800 dark:text-blue-300'),

    # Borders
    (r'(?<!dark:)border-red-200', 'border-red-200 dark:border-red-800/50'),
    (r'(?<!dark:)border-green-200', 'border-green-200 dark:border-green-800/50'),
    (r'(?<!dark:)border-blue-200', 'border-blue-200 dark:border-blue-800/50'),
    (r'(?<!dark:)border-yellow-200', 'border-yellow-200 dark:border-yellow-800/50'),
    (r'(?<!dark:)border-amber-200', 'border-amber-200 dark:border-amber-800/50'),
]

count = 0

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            temp_content = content
            
            # Fix broken opacities like `bg-white dark:bg-gray-800 /10` or `bg-white dark:bg-gray-800/10`
            # Pattern: (light_class) (dark_class) / (opacity)
            # Example: hover:bg-gray-50 dark:hover:bg-gray-700 /70
            # Replace with: \1/\3 \2/\3
            # We match the light class, the dark class, optional space, and the slash+opacity
            # regex: (hover:bg-[\w-]+|bg-[\w-]+|border-[\w-]+|text-[\w-]+)\s+(dark:(?:hover:)?(?:bg|border|text)-[\w-]+)\s*/(\d+)
            temp_content = re.sub(
                r'((?:hover:)?(?:bg|border|text)-[\w-]+)\s+(dark:(?:hover:)?(?:bg|border|text)-[\w-]+)\s*/(\d+)',
                r'\1/\3 \2/\3',
                temp_content
            )

            # Apply pastel mappings
            for light, dark in pastel_mappings:
                temp_content = re.sub(r'(?<![a-zA-Z0-9\-\:])' + light + r'(?![a-zA-Z0-9\-\:])', dark, temp_content)

            # Clean duplicates
            temp_content = re.sub(r'(dark:[\w/-]+)(?:\s+\1)+', r'\1', temp_content)
            
            if content != temp_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(temp_content)
                count += 1

print(f"Fixed opacities and pastel colors in {count} JSX files!")
