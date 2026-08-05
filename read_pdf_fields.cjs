const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function run() {
  try {
    const pdfBytes = fs.readFileSync('c:/Users/carpa/OneDrive/Escritorio/IMSS/Sistema-Gestion-Activos-Institucionales-Front/public/Formatos/FormatoPrestamos.pdf');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    fields.forEach(field => {
      console.log(field.getName());
    });
  } catch (err) {
    console.error(err);
  }
}

run();
