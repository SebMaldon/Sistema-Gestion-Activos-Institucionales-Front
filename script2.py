# -*- coding: utf-8 -*-
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

    # Generic state replacements
    if "const [currentPage, setCurrentPage] = useState(1);" not in content:
        content = re.sub(
            r'const\s+\[(after|cursor),\s*set[A-Z][a-z]+\]\s*=\s*useState\(null\);\s*const\s+\[(history|cursors),\s*set[A-Z][a-z]+\]\s*=\s*useState\(\[\]\);',
            'const [currentPage, setCurrentPage] = useState(1);\n  const set\\1 = () => {};\n  const set\\2 = () => setCurrentPage(1);\n  const \\1 = null;\n  const \\2 = { length: currentPage - 1 };',
            content,
            flags=re.IGNORECASE
        )
        content = re.sub(
            r'const\s+currentPage\s*=\s*(history|cursors)\.length\s*\+\s*1;',
            '',
            content
        )

    # Handlers
    content = re.sub(
        r'const\s+handleNextPage\s*=\s*\(\)\s*=>\s*\{.*?\};',
        'const handleNextPage = () => { setCurrentPage(p => p + 1); };',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'const\s+handlePrevPage\s*=\s*\(\)\s*=>\s*\{.*?\};',
        'const handlePrevPage = () => { setCurrentPage(p => Math.max(1, p - 1)); };',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'const\s+handleJumpToPage\s*=\s*\(e\)\s*=>\s*\{.*?\};',
        "const handleJumpToPage = (e) => { e.preventDefault(); const p = parseInt(pageInput); if (!isNaN(p) && p >= 1 && p <= (typeof totalPages !== 'undefined' ? totalPages : 9999)) { setCurrentPage(p); } setPageInput(''); };",
        content,
        flags=re.DOTALL
    )
    
    # Input constraints
    content = re.sub(r'max=\{currentPage\}', 'max={totalPages || 1}', content)
    content = re.sub(r'max=\{(history|cursors)\.length \+ 1\}', 'max={totalPages || 1}', content)
    
    # Tooltip text
    content = re.sub(r'Ingresa un n.mero entre 1 y \$\{currentPage\}\s*\(p.ginas visitadas\)', 'Ingresa un número de página válido', content)
    content = re.sub(r'P.ginas visitadas:\s*1\s*a\s*\$\{currentPage\}', 'Páginas: 1 a ', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Updated {filepath}")

