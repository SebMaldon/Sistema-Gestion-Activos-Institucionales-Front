const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/smmse/OneDrive/Documents/AppsResidencia/Sistema-Gestion-Activos-Institucionales-Front/src/pages/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Reemplazar la página 1 si es un span
  const regex1 = /\{currentPage > 2 && \(\s*<span className="[^"]+">1<\/span>\s*\)\}/g;
  if (regex1.test(content)) {
    content = content.replace(regex1, `{currentPage > 2 && (
                <button
                  onClick={() => setCurrentPage(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
                >
                  1
                </button>
              )}`);
    changed = true;
  }

  // Reemplazar la página final (totalPages)
  const regexTotal = /\{currentPage < totalPages - 1 && totalPages > 1 && \(\s*<span className="[^"]+">\{?totalPages\}?<\/span>\s*\)\}/g;
  if (regexTotal.test(content)) {
    content = content.replace(regexTotal, `{currentPage < totalPages - 1 && totalPages > 1 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
                >
                  {totalPages}
                </button>
              )}`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + f);
  }
});
