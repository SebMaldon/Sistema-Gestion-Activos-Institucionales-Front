# -*- coding: utf-8 -*-
import os

files = [
    r"c:\Users\smmse\OneDrive\Documents\AppsResidencia\Sistema-Gestion-Activos-Institucionales-Front\src\pages\Inventario.jsx",
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

    content = content.replace("const setcursor =", "const setCursor =")
    content = content.replace("const setcursors =", "const setCursors =")
    content = content.replace("const setafter =", "const setAfter =")
    content = content.replace("const sethistory =", "const setHistory =")
    
    # In Correspondencia.jsx we also have:
    # useEffect(() => { setCursor(null); setHistory([]); }, ...
    # but I previously replaced sethistory with setCurrentPage(1)
    # Wait, the state might have been setCursor and setHistory instead of setCursors
    # Let's just fix the declarations.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Fixed {filepath}")

