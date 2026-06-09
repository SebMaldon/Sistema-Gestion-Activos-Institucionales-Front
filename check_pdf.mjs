import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function run() {
  const fileBytes = fs.readFileSync('c:/Users/carpa/OneDrive/Escritorio/IMSS/Sistema-Gestion-Activos-Institucionales-Front/public/Formatos/FormatoRellenableSalidaBienes.pdf');
  const pdfDoc = await PDFDocument.load(fileBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log('Total fields:', fields.length);
  fields.forEach(field => {
    const type = field.constructor.name;
    const name = field.getName();
    console.log(`${type}: ${name}`);
  });
}

run().catch(console.error);
