import sys
import re
import os

files = [
    r"c:\Users\smmse\OneDrive\Documents\AppsResidencia\Sistema-Gestion-Activos-Institucionales-Front\src\pages\Unidades.jsx",
    r"c:\Users\smmse\OneDrive\Documents\AppsResidencia\Sistema-Gestion-Activos-Institucionales-Front\src\pages\Correspondencia.jsx",
    r"c:\Users\smmse\OneDrive\Documents\AppsResidencia\Sistema-Gestion-Activos-Institucionales-Front\src\pages\GestionUsuarios.jsx",
    r"c:\Users\smmse\OneDrive\Documents\AppsResidencia\Sistema-Gestion-Activos-Institucionales-Front\src\pages\Auditoria.jsx",
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    print(filepath)
    matches = re.findall(r'const\s+\[([a-zA-Z]+),\s*set[a-zA-Z]+\]\s*=\s*useState\(null\);\s*const\s+\[([a-zA-Z]+),\s*set[a-zA-Z]+\]\s*=\s*useState\(\[\]\);', content)
    print("Variables:", matches)
