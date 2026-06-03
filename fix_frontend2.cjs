const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Inventario.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const searchStr = `onClick={async () => {
                    if (!activeFicha.especificacionTI?.last_scan) return;`;

const replaceStr = `onClick={async () => {
                    const hasAgent = activeFicha.especificacionTI?.last_scan && activeFicha.programasPC?.some(p => p.nombre_programa === 'Gestor Activos HW');
                    if (!hasAgent) return;`;

content = content.replace(searchStr, replaceStr);

const searchStr2 = `disabled={!activeFicha.especificacionTI?.last_scan}
                  title={!activeFicha.especificacionTI?.last_scan ? "Agente no instalado o no reportando" : "Forzar escaneo de este equipo"}`;

const replaceStr2 = `disabled={!(activeFicha.especificacionTI?.last_scan && activeFicha.programasPC?.some(p => p.nombre_programa === 'Gestor Activos HW'))}
                  title={!(activeFicha.especificacionTI?.last_scan && activeFicha.programasPC?.some(p => p.nombre_programa === 'Gestor Activos HW')) ? "Agente no instalado o no reportando" : "Forzar escaneo de este equipo"}`;

content = content.replace(searchStr2, replaceStr2);

const searchStr3 = `!activeFicha.especificacionTI?.last_scan 
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'`;

const replaceStr3 = `!(activeFicha.especificacionTI?.last_scan && activeFicha.programasPC?.some(p => p.nombre_programa === 'Gestor Activos HW')) 
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'`;

content = content.replace(searchStr3, replaceStr3);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Inventario.jsx with Agent Name condition');
