import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function run() {
  const bytes = fs.readFileSync('./Formatos/FormatoRellenableSalidaBienes.pdf');
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  
  // Rellenar un campo de prueba para asegurar que el valor persiste
  try {
    form.getTextField('FOLIO').setText('123');
  } catch (e) {}

  form.flatten();
  
  const flattenedBytes = await doc.save();
  const finalDoc = await PDFDocument.create();
  
  const [embeddedPage] = await finalDoc.embedPdf(flattenedBytes, [0]);
  const page = finalDoc.addPage([612, 792]);
  
  // Escalar y centrar
  const scale = 1.15;
  // Si escalamos a 1.15, el tamaño virtual es 612 * 1.15 = 703.8. 
  // Para centrar en 612, x = (612 - 703.8) / 2 = -45.9
  const x = (612 - (612 * scale)) / 2;
  const y = (792 - (792 * scale)) / 2;

  page.drawPage(embeddedPage, {
    x: x,
    y: y,
    xScale: scale,
    yScale: scale
  });
  
  fs.writeFileSync('./test_scaled.pdf', await finalDoc.save());
  console.log('Done');
}

run().catch(console.error);
