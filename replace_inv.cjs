const fs = require('fs');
const path = 'src/pages/Inventario.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("{prog.nombre_programa || '-'}", "{prog.programa || '-'}");
fs.writeFileSync(path, content);
