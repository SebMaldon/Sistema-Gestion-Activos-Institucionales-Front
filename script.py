# -*- coding: utf-8 -*-
import sys
import re
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
        print(f"Not found: {filepath}")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. State replacements
    if "const [currentPage, setCurrentPage] = useState(1);" not in content:
        content = re.sub(
            r'const\s+\[cursor,\s*setCursor\]\s*=\s*useState\(null\);\s*const\s+\[cursors,\s*setCursors\]\s*=\s*useState\(\[\]\);.*?//.*?(?:\n|\r\n)',
            'const [currentPage, setCurrentPage] = useState(1);\n  const setCursor = () => {};\n  const setCursors = () => setCurrentPage(1);\n  const cursor = null;\n  const cursors = { length: currentPage - 1 };\n',
            content,
            flags=re.DOTALL
        )
        content = re.sub(
            r'const\s+\[cursor,\s*setCursor\]\s*=\s*useState\(null\);\s*const\s+\[cursors,\s*setCursors\]\s*=\s*useState\(\[\]\);',
            'const [currentPage, setCurrentPage] = useState(1);\n  const setCursor = () => {};\n  const setCursors = () => setCurrentPage(1);\n  const cursor = null;\n  const cursors = { length: currentPage - 1 };',
            content
        )

    # 2. Query calls
    content = re.sub(r'after:\s*cursor\s*\?\?\s*undefined', 'page: currentPage', content)
    content = re.sub(r'after:\s*cursor\s*\|\|\s*undefined', 'page: currentPage', content)
    content = re.sub(r'after:\s*cursor', 'page: currentPage', content)

    # 3. Handlers
    content = re.sub(
        r'const\s+handleNextPage\s*=\s*\(\)\s*=>\s*\{.*?\};',
        'const handleNextPage = () => { setCurrentPage(p => p + 1); };',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'const\s+handlePrevPage\s*=\s*\(\)\s*=>\s*\{.*?\};',
        'const handlePrevPage = () => { setCurrentPage(p => max(1, p - 1)); };',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'const\s+handleJumpToPage\s*=\s*\(e\)\s*=>\s*\{.*?\};',
        "const handleJumpToPage = (e) => { e.preventDefault(); const p = parseInt(pageInput); if (!isNaN(p) && p >= 1 && p <= (typeof totalPages !== 'undefined' ? totalPages : 9999)) { setCurrentPage(p); } setPageInput(''); };",
        content,
        flags=re.DOTALL
    )

    # 4. Input constraints
    content = re.sub(r'max=\{currentPage\}', 'max={totalPages || 1}', content)
    content = re.sub(r'max=\{cursors\.length \+ 1\}', 'max={totalPages || 1}', content)
    
    # Tooltip text
    content = re.sub(r'Ingresa un n.mero entre 1 y \$\{currentPage\}\s*\(p.ginas visitadas\)', 'Ingresa un número de página válido', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Updated {filepath}")

