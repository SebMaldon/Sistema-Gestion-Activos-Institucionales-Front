const fs = require('fs');
const path = require('path');

const directory = 'c:/Users/carpa/OneDrive/Escritorio/IMSS/Sistema-Gestion-Activos-Institucionales-Front/src';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(directory);
let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    const regex1 = / \$\{hoverZoomEnabled \? 'hover-cell-zoom' : ''\}/g;
    const regex2 = / className=\{hoverZoomEnabled \? 'hover-cell-zoom' : ''\}/g;
    
    if (regex1.test(content)) {
        content = content.replace(regex1, '');
        changed = true;
    }
    if (regex2.test(content)) {
        content = content.replace(regex2, ' className=""');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Cleaned ' + path.basename(file));
        count++;
    }
});
console.log('Total cleaned: ' + count);
